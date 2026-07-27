import assert from 'node:assert/strict';
import {after, beforeEach, test} from 'node:test';

import {createPool} from '../../src/server/db/pool';
import {runGoldenDemo} from '../../src/server/demo';
import {createDeterministicRuntime} from '../../src/server/domain/runtime';
import {resetOwnedTables} from './test-db';

const pool = createPool({max: 20});

after(async () => {
  await pool.end();
});

beforeEach(async () => {
  await resetOwnedTables(pool);
});

test('golden demo proves quarantine, receipt finality, and a higher next-job cap', async () => {
  const result = await runGoldenDemo(pool, {
    namespace: 'golden_a',
    runtime: createDeterministicRuntime(),
  });

  assert.equal(
    result.work.early_eight_dollar_attempt.reason_code,
    'REPUTATION_LIMIT_EXCEEDED',
  );
  assert.equal(result.work.first.status, 'authorized');
  assert.equal(result.work.revision.status, 'revise');
  assert.equal(result.work.pass.status, 'final_pass');
  assert.equal(result.settlement.unknown.status, 'settlement_unknown');
  assert.equal(result.settlement.confirmed.status, 'complete');
  assert.equal(result.proofs.same_idempotency_key_same_work_order, true);
  assert.equal(result.proofs.unknown_state_kept_full_reservation, true);
  assert.equal(result.proofs.no_receipt_before_reconciliation, true);
  assert.equal(result.proofs.no_reputation_before_final_receipt, true);
  assert.equal(result.reputation.before.max_job_amount_minor, '500');
  assert.equal(result.reputation.after.max_job_amount_minor, '1000');
  assert.equal(result.work.second.status, 'authorized');
  assert.equal(result.work.second.resource?.amount_minor, '800');
  assert.deepEqual(result.authority.root.exposure_after_first_settlement, {
    authority_grant_id: result.authority.root.id,
    limit_minor: '2000',
    reserved_minor: '0',
    settled_minor: '500',
    available_minor: '1500',
  });
  assert.deepEqual(result.authority.child.exposure_after_first_settlement, {
    authority_grant_id: result.authority.child.id,
    limit_minor: '1500',
    reserved_minor: '0',
    settled_minor: '500',
    available_minor: '1000',
  });
  assert.deepEqual(result.authority.root.final_exposure, {
    authority_grant_id: result.authority.root.id,
    limit_minor: '2000',
    reserved_minor: '800',
    settled_minor: '500',
    available_minor: '700',
  });
  assert.deepEqual(result.authority.child.final_exposure, {
    authority_grant_id: result.authority.child.id,
    limit_minor: '1500',
    reserved_minor: '800',
    settled_minor: '500',
    available_minor: '200',
  });
});

test('each golden demo run creates an isolated authority tree', async () => {
  const first = await runGoldenDemo(pool, {
    namespace: 'golden_first',
    runtime: createDeterministicRuntime(
      new Date('2026-07-30T00:00:00.000Z'),
    ),
  });
  const second = await runGoldenDemo(pool, {
    namespace: 'golden_second',
    runtime: createDeterministicRuntime(
      new Date('2026-07-31T00:00:00.000Z'),
    ),
  });

  assert.notEqual(first.receipt.receipt_id, second.receipt.receipt_id);
  const counts = await pool.query<{
    participants: string;
    authorities: string;
    receipts: string;
  }>(`
    SELECT
      (SELECT COUNT(*)::text FROM mecharoon.participants) AS participants,
      (SELECT COUNT(*)::text FROM mecharoon.authority_grants) AS authorities,
      (SELECT COUNT(*)::text FROM mecharoon.final_receipts) AS receipts
  `);
  assert.deepEqual(counts.rows[0], {
    participants: '4',
    authorities: '4',
    receipts: '2',
  });
});
