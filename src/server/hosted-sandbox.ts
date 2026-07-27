import {createHash} from 'node:crypto';

import type {Pool, PoolClient} from 'pg';

import {withTransaction} from './db/transaction';
import {runHostedGoldenDemo, type GoldenDemoResult} from './demo';
import {DomainError} from './domain/errors';
import type {ServiceResult} from './domain/result';
import {systemRuntime, type Runtime} from './domain/runtime';

const WORKFLOW_VERSION = 'coding_v0';
const REQUEST_HASH = hashText(`${WORKFLOW_VERSION}:fixed-input:v1`);

type SandboxRunRow = {
  id: string;
  request_hash: string;
  namespace: string;
  status: 'running' | 'complete' | 'failed';
  result: GoldenDemoResult | null;
  failure_reason_code: string | null;
};

type Claim =
  | {
      kind: 'claimed';
      runId: string;
      namespace: string;
    }
  | {
      kind: 'replay';
      result: GoldenDemoResult;
    };

export type HostedSandboxResult = {
  replayed: boolean;
  response: ServiceResult<GoldenDemoResult>;
};

function hashText(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function configuredDailyLimit(): number {
  const parsed = Number.parseInt(
    process.env.MECHAROON_SANDBOX_DAILY_RUN_LIMIT ?? '',
    10,
  );
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 100 ? parsed : 20;
}

function namespaceFor(partnerId: string, idempotencyKeyHash: string): string {
  return `hs_${hashText(partnerId).slice(0, 12)}_${idempotencyKeyHash.slice(0, 28)}`;
}

function completeResponse(
  result: GoldenDemoResult,
): ServiceResult<GoldenDemoResult> {
  return {
    status: 'complete',
    reason_code: 'SANDBOX_RUN_COMPLETE',
    next_actions: [],
    resource: result,
  };
}

async function selectRun(
  client: PoolClient,
  partnerId: string,
  idempotencyKeyHash: string,
): Promise<SandboxRunRow | undefined> {
  const existing = await client.query<SandboxRunRow>(
    `
      SELECT
        id,
        request_hash,
        namespace,
        status,
        result,
        failure_reason_code
      FROM mecharoon.sandbox_runs
      WHERE partner_id = $1 AND idempotency_key_hash = $2
      FOR UPDATE
    `,
    [partnerId, idempotencyKeyHash],
  );
  return existing.rows[0];
}

async function claimRun(
  pool: Pool,
  input: {
    partnerId: string;
    idempotencyKeyHash: string;
    runtime: Runtime;
  },
): Promise<Claim> {
  return withTransaction(pool, async (client) => {
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      [`mecharoon-hosted-sandbox:${input.partnerId}`],
    );

    const existing = await selectRun(
      client,
      input.partnerId,
      input.idempotencyKeyHash,
    );
    if (existing) {
      if (existing.request_hash !== REQUEST_HASH) {
        throw new DomainError(
          409,
          'IDEMPOTENCY_CONFLICT',
          'This idempotency key belongs to a different sandbox workflow version.',
        );
      }
      if (existing.status === 'complete' && existing.result) {
        return {kind: 'replay', result: existing.result};
      }
      if (existing.status === 'failed') {
        throw new DomainError(
          409,
          'SANDBOX_RUN_FAILED',
          `The prior run failed with ${existing.failure_reason_code ?? 'SANDBOX_RUN_FAILED'}; retry with a new idempotency key.`,
        );
      }
      throw new DomainError(
        409,
        'SANDBOX_RUN_IN_PROGRESS',
        'The sandbox run with this idempotency key is still in progress.',
      );
    }

    const now = input.runtime.now();
    const count = await client.query<{count: string}>(
      `
        SELECT COUNT(*)::text AS count
        FROM mecharoon.sandbox_runs
        WHERE partner_id = $1
          AND created_at >= $2
      `,
      [input.partnerId, new Date(now.getTime() - 24 * 60 * 60 * 1000)],
    );
    if (Number.parseInt(count.rows[0]?.count ?? '0', 10) >= configuredDailyLimit()) {
      throw new DomainError(
        429,
        'SANDBOX_RUN_LIMIT_REACHED',
        'This invite has reached its rolling 24-hour sandbox run limit.',
      );
    }

    const runId = input.runtime.id('sandbox_run');
    const namespace = namespaceFor(
      input.partnerId,
      input.idempotencyKeyHash,
    );
    await client.query(
      `
        INSERT INTO mecharoon.sandbox_runs (
          id,
          partner_id,
          idempotency_key_hash,
          request_hash,
          namespace,
          status,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, 'running', $6, $6)
      `,
      [
        runId,
        input.partnerId,
        input.idempotencyKeyHash,
        REQUEST_HASH,
        namespace,
        now,
      ],
    );

    return {kind: 'claimed', runId, namespace};
  });
}

async function markComplete(
  pool: Pool,
  runId: string,
  result: GoldenDemoResult,
  now: Date,
): Promise<void> {
  const updated = await pool.query(
    `
      UPDATE mecharoon.sandbox_runs
      SET
        status = 'complete',
        result = $2::jsonb,
        failure_reason_code = NULL,
        updated_at = $3,
        completed_at = $3
      WHERE id = $1 AND status = 'running'
    `,
    [runId, JSON.stringify(result), now],
  );
  if (updated.rowCount !== 1) {
    throw new DomainError(
      409,
      'SANDBOX_RUN_STATE_CONFLICT',
      'The sandbox run could not be finalized from its current state.',
    );
  }
}

async function markFailed(
  pool: Pool,
  runId: string,
  reasonCode: string,
  now: Date,
): Promise<void> {
  await pool.query(
    `
      UPDATE mecharoon.sandbox_runs
      SET
        status = 'failed',
        result = NULL,
        failure_reason_code = $2,
        updated_at = $3,
        completed_at = $3
      WHERE id = $1 AND status = 'running'
    `,
    [runId, reasonCode, now],
  );
}

export async function runHostedSandbox(
  pool: Pool,
  input: {
    partnerId: string;
    idempotencyKey: string;
    runtime?: Runtime;
  },
): Promise<HostedSandboxResult> {
  const runtime = input.runtime ?? systemRuntime;
  const claim = await claimRun(pool, {
    partnerId: input.partnerId,
    idempotencyKeyHash: hashText(input.idempotencyKey),
    runtime,
  });

  if (claim.kind === 'replay') {
    return {
      replayed: true,
      response: completeResponse(claim.result),
    };
  }

  try {
    const result = await runHostedGoldenDemo(pool, {
      runtime,
      namespace: claim.namespace,
    });
    await markComplete(pool, claim.runId, result, runtime.now());
    return {
      replayed: false,
      response: completeResponse(result),
    };
  } catch (error) {
    const reasonCode =
      error instanceof DomainError ? error.reasonCode : 'SANDBOX_RUN_FAILED';
    await markFailed(pool, claim.runId, reasonCode, runtime.now());
    throw error;
  }
}
