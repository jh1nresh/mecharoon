import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HOSTED_WALKTHROUGH_RESULT,
  HOSTED_WALKTHROUGH_STEPS,
} from '../../src/app/demo/walkthrough';

test('hosted walkthrough stays illustrative and fund-free', () => {
  assert.equal(HOSTED_WALKTHROUGH_RESULT.mode, 'hosted_walkthrough');
  assert.equal(HOSTED_WALKTHROUGH_RESULT.real_funds, false);
  assert.equal(
    HOSTED_WALKTHROUGH_RESULT.settlement_adapter,
    'illustrative_noop_v0',
  );
  assert.match(HOSTED_WALKTHROUGH_RESULT.run_id, /^illustrative-/);
  assert.match(
    HOSTED_WALKTHROUGH_RESULT.receipt.receipt_hash,
    /^sample_/,
  );
  assert.match(
    HOSTED_WALKTHROUGH_RESULT.receipt.receipt.settlement.tx_hash,
    /^sample_/,
  );
  assert.equal(
    Object.values(HOSTED_WALKTHROUGH_RESULT.proofs).every(Boolean),
    true,
  );
});

test('hosted walkthrough proves the complete bounded settlement loop', () => {
  assert.deepEqual(
    HOSTED_WALKTHROUGH_STEPS.map((step) => step.code),
    [
      'DELEGATE',
      'REPUTATION_GATE',
      'RESERVE',
      'EVALUATE',
      'INSTRUCT',
      'QUARANTINE',
      'RECONCILE',
      'COMPOUND',
    ],
  );

  assert.equal(HOSTED_WALKTHROUGH_STEPS[3]?.status, 'revise');
  assert.equal(HOSTED_WALKTHROUGH_STEPS[4]?.status, 'pass');
  assert.equal(HOSTED_WALKTHROUGH_STEPS[5]?.status, 'unknown');
  assert.equal(HOSTED_WALKTHROUGH_STEPS[5]?.reserved, '$5');
  assert.equal(HOSTED_WALKTHROUGH_STEPS[6]?.status, 'confirmed');
  assert.equal(HOSTED_WALKTHROUGH_STEPS[7]?.next_limit, '$10 · $8 authorized');
});
