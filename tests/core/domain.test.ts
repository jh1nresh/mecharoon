import assert from "node:assert/strict";
import test from "node:test";

import { DomainError } from "../../src/server/domain/errors";
import { sha256, stableStringify } from "../../src/server/domain/hash";
import { parseMinorAmount } from "../../src/server/domain/money";
import {
  codingPolicyHash,
  evaluateCodingSubmission,
} from "../../src/server/evaluation/coding-v0";
import { submitWorkSchema } from "../../src/server/domain/schemas";
import { buildFinalReceipt } from "../../src/server/receipts/final-receipt";
import { deriveCodingReputationView } from "../../src/server/reputation/coding-v0";

test("money accepts bigint-safe decimal strings and rejects floats", () => {
  assert.equal(parseMinorAmount("9007199254740993"), BigInt("9007199254740993"));
  assert.throws(
    () => parseMinorAmount("1.25"),
    (error) =>
      error instanceof DomainError && error.reasonCode === "INVALID_AMOUNT",
  );
  assert.throws(
    () => parseMinorAmount("0"),
    (error) =>
      error instanceof DomainError && error.reasonCode === "INVALID_AMOUNT",
  );
});

test("canonical hashing is independent of object key insertion order", () => {
  const left = { b: "two", a: { d: BigInt(4), c: "three" } };
  const right = { a: { c: "three", d: "4" }, b: "two" };
  assert.equal(stableStringify(left), stableStringify(right));
  assert.equal(sha256(left), sha256(right));
});

test("coding evaluator deterministically returns REVISE then PASS", () => {
  const revise = evaluateCodingSubmission(["lint", "unit"], [
    { name: "lint", status: "pass" },
    { name: "unit", status: "fail" },
  ]);
  assert.equal(revise.outcome, "revise");
  assert.deepEqual(revise.reasonCodes, ["REQUIRED_CHECK_FAILED"]);

  const pass = evaluateCodingSubmission(["unit", "lint"], [
    { name: "unit", status: "pass" },
    { name: "lint", status: "pass" },
  ]);
  assert.equal(pass.outcome, "pass");
  assert.deepEqual(pass.reasonCodes, ["ALL_REQUIRED_CHECKS_PASSED"]);
  assert.equal(
    codingPolicyHash(["unit", "lint"]),
    codingPolicyHash(["lint", "unit"]),
  );
});

test("contextual reputation raises the per-job cap only after a receipt", () => {
  const newSeller = deriveCodingReputationView({
    subjectId: "seller",
    evaluatorPolicyHash: "policy",
    receiptIds: [],
    totalRevisionCount: 0,
  });
  assert.equal(newSeller.max_job_amount_minor, "500");
  assert.equal(newSeller.route_code, "new_seller");

  const provenSeller = deriveCodingReputationView({
    subjectId: "seller",
    evaluatorPolicyHash: "policy",
    receiptIds: ["receipt_1"],
    totalRevisionCount: 1,
  });
  assert.equal(provenSeller.max_job_amount_minor, "1000");
  assert.equal(provenSeller.route_code, "proven_once");
});

test("FinalReceipt includes commitments but no raw checks, token, or signature", () => {
  const { receipt } = buildFinalReceipt({
    receiptId: "receipt_1",
    workOrder: {
      id: "wo_1",
      buyer_id: "buyer",
      seller_id: "seller",
      authority_grant_id: "child",
      amount_minor: "500",
      task_ref: "demo://task",
      acceptance_policy_id: "required-checks-v1",
      acceptance_policy_version: 1,
      acceptance_policy_hash: "policy",
    },
    authorityLineage: ["root", "child"],
    reservationId: "res_1",
    submission: {
      artifact_ref: "demo://artifact",
      artifact_sha256: "a".repeat(64),
      sequence: 2,
    },
    verdict: {
      reason_codes: ["ALL_REQUIRED_CHECKS_PASSED"],
      evaluator_policy_hash: "policy",
    },
    revisionCount: 1,
    instruction: {
      id: "si_1",
      instruction_hash: "instruction",
      amount_minor: "500",
      payer_id: "buyer",
      payee_id: "seller",
    },
    txHash: `0x${"b".repeat(64)}`,
    finalizedAt: new Date("2026-07-26T00:00:00.000Z"),
  });

  const serialized = JSON.stringify(receipt);
  assert.doesNotMatch(serialized, /normalized_check_results|api_token|signature/);
  assert.match(serialized, /artifact_sha256/);
  assert.match(serialized, /instruction_hash/);
});

test("submission evidence rejects duplicate check names", () => {
  const parsed = submitWorkSchema.safeParse({
    work_order_id: "wo_1",
    artifact_ref: "demo://artifact",
    artifact_sha256: "a".repeat(64),
    checks: [
      { name: "unit", status: "fail" },
      { name: "unit", status: "pass" },
    ],
    idempotency_key: "submission-1",
  });
  assert.equal(parsed.success, false);
});
