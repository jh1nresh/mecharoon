import type {Pool} from 'pg';

import {createAgentService} from './agent';
import {sha256} from './domain/hash';
import {systemRuntime, type Runtime} from './domain/runtime';
import {codingPolicyHash} from './evaluation/coding-v0';
import {createOperatorService} from './operator';
import {createQueryService} from './queries';
import {seedDemo} from './setup';

function requiredResource<T>(
  value: T | null,
  operation: string,
): NonNullable<T> {
  if (!value) {
    throw new Error(`${operation} did not return a resource.`);
  }
  return value;
}

async function assertDemoDatabase(pool: Pool): Promise<void> {
  const result = await pool.query<{
    name: string;
    address: string | null;
  }>(
    `
      SELECT
        current_database() AS name,
        host(inet_server_addr()) AS address
    `,
  );
  const database = result.rows[0]?.name;
  const address = result.rows[0]?.address;
  if (
    (database !== 'mecharoon_dev' && database !== 'mecharoon_test') ||
    (address !== null && address !== '127.0.0.1' && address !== '::1')
  ) {
    throw new Error(
      `The golden demo may run only on local mecharoon_dev or mecharoon_test; connected to ${database ?? '<unknown>'} at ${address ?? 'local socket'}.`,
    );
  }
}

export async function runGoldenDemo(
  pool: Pool,
  options: {runtime?: Runtime; namespace?: string} = {},
) {
  await assertDemoDatabase(pool);
  const runtime = options.runtime ?? systemRuntime;
  const namespace =
    options.namespace ??
    runtime.id('demo').replace(/[^a-z0-9_]/g, '').slice(0, 48);
  const runRuntime: Runtime = {
    now: () => runtime.now(),
    id: (prefix) => runtime.id(`${namespace}_${prefix}`),
  };
  const seed = await seedDemo(pool, {runtime: runRuntime, namespace});
  const agent = createAgentService(pool, {runtime: runRuntime});
  const operator = createOperatorService(pool, {runtime: runRuntime});
  const queries = createQueryService(pool);
  const policyHash = codingPolicyHash(['lint', 'unit']);

  const reputationBefore = await queries.getReputationView({
    subjectId: seed.sellerId,
    evaluatorPolicyHash: policyHash,
  });

  const earlyEightDollarAttempt = await agent.createWorkOrder({
    buyer_id: seed.buyerId,
    seller_id: seed.sellerId,
    authority_grant_id: seed.childAuthorityId,
    amount_minor: '800',
    task_ref: `demo://coding/${namespace}/too-early`,
    required_checks: ['lint', 'unit'],
    idempotency_key: `${namespace}-too-early`,
  });

  const firstWorkInput = {
    buyer_id: seed.buyerId,
    seller_id: seed.sellerId,
    authority_grant_id: seed.childAuthorityId,
    amount_minor: '500',
    task_ref: `demo://coding/${namespace}/first`,
    required_checks: ['lint', 'unit'],
    idempotency_key: `${namespace}-first-work`,
  };
  const firstWork = await agent.createWorkOrder(firstWorkInput);
  const firstWorkResource = requiredResource(
    firstWork.resource,
    'First work authorization',
  );
  const replayedFirstWork = await agent.createWorkOrder(firstWorkInput);

  const revision = await agent.submitWork({
    work_order_id: firstWorkResource.id,
    artifact_ref: `demo://artifact/${namespace}/revision`,
    artifact_sha256: sha256(`${namespace}:revision`),
    checks: [
      {name: 'lint', status: 'pass'},
      {name: 'unit', status: 'fail'},
    ],
    idempotency_key: `${namespace}-revision`,
  });

  const pass = await agent.submitWork({
    work_order_id: firstWorkResource.id,
    artifact_ref: `demo://artifact/${namespace}/pass`,
    artifact_sha256: sha256(`${namespace}:pass`),
    checks: [
      {name: 'lint', status: 'pass'},
      {name: 'unit', status: 'pass'},
    ],
    idempotency_key: `${namespace}-pass`,
  });
  const instructionId = requiredResource(
    pass.resource,
    'Passing submission',
  ).settlement_instruction_id;
  if (!instructionId) {
    throw new Error('Passing submission did not create a settlement instruction.');
  }

  const unknown = await operator.executeSettlement({
    instruction_id: instructionId,
    scenario: 'unknown',
    idempotency_key: `${namespace}-execute`,
  });
  const exposureWhileUnknown = await queries.getAuthorityExposure(
    seed.childAuthorityId,
  );
  const receiptWhileUnknown = await queries.getFinalReceipt(
    firstWorkResource.id,
  );
  const reputationWhileUnknown = await queries.getReputationView({
    subjectId: seed.sellerId,
    evaluatorPolicyHash: policyHash,
  });

  const confirmed = await operator.reconcileSettlement({
    instruction_id: instructionId,
    scenario: 'confirmed',
    idempotency_key: `${namespace}-reconcile`,
  });
  const receipt = requiredResource(
    await queries.getFinalReceipt(firstWorkResource.id),
    'Final receipt',
  );
  const reputationAfter = await queries.getReputationView({
    subjectId: seed.sellerId,
    evaluatorPolicyHash: policyHash,
  });
  const rootExposureAfter = await queries.getAuthorityExposure(
    seed.rootAuthorityId,
  );
  const childExposureAfter = await queries.getAuthorityExposure(
    seed.childAuthorityId,
  );

  const secondWork = await agent.createWorkOrder({
    buyer_id: seed.buyerId,
    seller_id: seed.sellerId,
    authority_grant_id: seed.childAuthorityId,
    amount_minor: '800',
    task_ref: `demo://coding/${namespace}/second`,
    required_checks: ['lint', 'unit'],
    idempotency_key: `${namespace}-second-work`,
  });

  return {
    run_id: namespace,
    mode: 'local_sandbox',
    settlement_adapter: 'simulated_onchain_v0',
    real_funds: false,
    timeline: [
      {
        step: 1,
        code: 'DELEGATE',
        status: 'complete',
        detail: '$20 root authority attenuated to a $15 child grant.',
      },
      {
        step: 2,
        code: 'REPUTATION_GATE',
        status: earlyEightDollarAttempt.status,
        detail: '$8 is denied before any finalized receipt; the initial cap is $5.',
      },
      {
        step: 3,
        code: 'RESERVE',
        status: firstWork.status,
        detail: '$5 is reserved against both root and child authority.',
      },
      {
        step: 4,
        code: 'EVALUATE',
        status: revision.status,
        detail: 'The first artifact fails a required check and receives REVISE.',
      },
      {
        step: 5,
        code: 'INSTRUCT',
        status: pass.status,
        detail: 'The corrected artifact passes and creates a reservation-bound instruction.',
      },
      {
        step: 6,
        code: 'QUARANTINE',
        status: unknown.status,
        detail: 'Unknown adapter state keeps the full $5 reserved.',
      },
      {
        step: 7,
        code: 'RECONCILE',
        status: confirmed.status,
        detail: 'Confirmed simulated finality creates a FinalReceipt and reputation event.',
      },
      {
        step: 8,
        code: 'COMPOUND',
        status: secondWork.status,
        detail: 'The receipt raises the contextual cap to $10, so the next $8 job is authorized.',
      },
    ],
    authority: {
      root: {
        id: seed.rootAuthorityId,
        limit_minor: seed.rootLimitMinor,
        final_exposure: rootExposureAfter,
      },
      child: {
        id: seed.childAuthorityId,
        limit_minor: seed.childLimitMinor,
        exposure_while_unknown: exposureWhileUnknown,
        final_exposure: childExposureAfter,
      },
    },
    work: {
      early_eight_dollar_attempt: earlyEightDollarAttempt,
      first: firstWork,
      revision,
      pass,
      second: secondWork,
    },
    settlement: {
      unknown,
      confirmed,
    },
    receipt,
    reputation: {
      before: reputationBefore,
      while_unknown: reputationWhileUnknown,
      after: reputationAfter,
    },
    proofs: {
      same_idempotency_key_same_work_order:
        replayedFirstWork.resource?.id === firstWorkResource.id,
      unknown_state_kept_full_reservation:
        exposureWhileUnknown.reserved_minor === '500',
      no_receipt_before_reconciliation: receiptWhileUnknown === null,
      no_reputation_before_final_receipt:
        reputationWhileUnknown.sample_size === 0,
      receipt_hash: receipt.receipt_hash,
      simulated_tx_hash: confirmed.resource?.tx_hash ?? null,
      next_job_route: secondWork.resource?.route_code ?? null,
    },
  };
}
