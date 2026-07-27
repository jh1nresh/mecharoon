import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {after, beforeEach, test} from 'node:test';

import {createPool} from '../../src/server/db/pool';
import {DomainError} from '../../src/server/domain/errors';
import {createDeterministicRuntime} from '../../src/server/domain/runtime';
import {runHostedSandbox} from '../../src/server/hosted-sandbox';
import {resetOwnedTables} from './test-db';

const pool = createPool({max: 20});
const originalDailyLimit = process.env.MECHAROON_SANDBOX_DAILY_RUN_LIMIT;

after(async () => {
  if (originalDailyLimit === undefined) {
    delete process.env.MECHAROON_SANDBOX_DAILY_RUN_LIMIT;
  } else {
    process.env.MECHAROON_SANDBOX_DAILY_RUN_LIMIT = originalDailyLimit;
  }
  await pool.end();
});

beforeEach(async () => {
  process.env.MECHAROON_SANDBOX_DAILY_RUN_LIMIT = '20';
  await resetOwnedTables(pool);
});

test('a fixed hosted run is durable, replayable, and stores only a hashed key', async () => {
  const partnerId = 'partner_alpha';
  const idempotencyKey = 'recording-run-1-sensitive';
  const runtime = createDeterministicRuntime(
    new Date('2026-07-27T00:00:00.000Z'),
  );

  const first = await runHostedSandbox(pool, {
    partnerId,
    idempotencyKey,
    runtime,
  });
  assert.equal(first.replayed, false);
  assert.equal(first.response.status, 'complete');
  assert.equal(first.response.reason_code, 'SANDBOX_RUN_COMPLETE');
  assert.ok(first.response.resource);
  assert.equal(first.response.resource.mode, 'hosted_sandbox');
  assert.equal(first.response.resource.real_funds, false);

  const replay = await runHostedSandbox(pool, {
    partnerId,
    idempotencyKey,
    runtime,
  });
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.response, first.response);
  assert.equal(
    replay.response.resource?.receipt.receipt_id,
    first.response.resource.receipt.receipt_id,
  );

  const stored = await pool.query<{
    idempotency_key_hash: string;
    status: string;
    result_json: string;
  }>(
    `
      SELECT
        idempotency_key_hash,
        status,
        result::text AS result_json
      FROM mecharoon.sandbox_runs
      WHERE partner_id = $1
    `,
    [partnerId],
  );
  assert.equal(stored.rowCount, 1);
  assert.equal(
    stored.rows[0]?.idempotency_key_hash,
    createHash('sha256').update(idempotencyKey).digest('hex'),
  );
  assert.equal(stored.rows[0]?.status, 'complete');
  assert.equal(stored.rows[0]?.result_json.includes(idempotencyKey), false);

  const resource = first.response.resource;
  const authorityRows = await pool.query<{
    id: string;
    reserved_minor: string;
    settled_minor: string;
    available_minor: string;
  }>(
    `
      SELECT
        id,
        reserved_minor::text,
        settled_minor::text,
        (limit_minor - reserved_minor - settled_minor)::text AS available_minor
      FROM mecharoon.authority_grants
      WHERE id = ANY($1::text[])
      ORDER BY id
    `,
    [[resource.authority.root.id, resource.authority.child.id]],
  );
  const byId = new Map(authorityRows.rows.map((row) => [row.id, row]));
  assert.deepEqual(byId.get(resource.authority.root.id), {
    id: resource.authority.root.id,
    reserved_minor: '800',
    settled_minor: '500',
    available_minor: '700',
  });
  assert.deepEqual(byId.get(resource.authority.child.id), {
    id: resource.authority.child.id,
    reserved_minor: '800',
    settled_minor: '500',
    available_minor: '200',
  });
  assert.deepEqual(resource.authority.root.final_exposure, {
    authority_grant_id: resource.authority.root.id,
    limit_minor: '2000',
    reserved_minor: '800',
    settled_minor: '500',
    available_minor: '700',
  });
  assert.deepEqual(resource.authority.child.final_exposure, {
    authority_grant_id: resource.authority.child.id,
    limit_minor: '1500',
    reserved_minor: '800',
    settled_minor: '500',
    available_minor: '200',
  });
});

test('the daily quota rejects a second distinct idempotency key', async () => {
  process.env.MECHAROON_SANDBOX_DAILY_RUN_LIMIT = '1';
  const runtime = createDeterministicRuntime(
    new Date('2026-07-27T12:00:00.000Z'),
  );
  await runHostedSandbox(pool, {
    partnerId: 'partner_quota',
    idempotencyKey: 'quota-run-1',
    runtime,
  });

  await assert.rejects(
    runHostedSandbox(pool, {
      partnerId: 'partner_quota',
      idempotencyKey: 'quota-run-2',
      runtime,
    }),
    (error) =>
      error instanceof DomainError &&
      error.reasonCode === 'SANDBOX_RUN_LIMIT_REACHED' &&
      error.httpStatus === 429,
  );
});
