import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import { createAgentService } from "../../src/server/agent";
import { createPool } from "../../src/server/db/pool";
import { DomainError } from "../../src/server/domain/errors";
import { sha256 } from "../../src/server/domain/hash";
import { createDeterministicRuntime } from "../../src/server/domain/runtime";
import { codingPolicyHash } from "../../src/server/evaluation/coding-v0";
import { createOperatorService } from "../../src/server/operator";
import { createQueryService } from "../../src/server/queries";
import { seedDemo } from "../../src/server/setup";
import { resetOwnedTables } from "./test-db";

const pool = createPool({ max: 20 });

after(async () => {
  await pool.end();
});

beforeEach(async () => {
  await resetOwnedTables(pool);
});

test("REVISE → PASS → unknown quarantine → confirmed receipt → higher second-job cap", async () => {
  const runtime = createDeterministicRuntime();
  const seed = await seedDemo(pool, { runtime });
  const agent = createAgentService(pool, { runtime });
  const operator = createOperatorService(pool, { runtime });
  const queries = createQueryService(pool);
  const policyHash = codingPolicyHash(["lint", "unit"]);

  const initialReputation = await queries.getReputationView({
    subjectId: seed.sellerId,
    evaluatorPolicyHash: policyHash,
  });
  assert.equal(initialReputation.max_job_amount_minor, "500");

  const prematureSecond = await agent.createWorkOrder({
    buyer_id: seed.buyerId,
    seller_id: seed.sellerId,
    authority_grant_id: seed.childAuthorityId,
    amount_minor: "800",
    task_ref: "demo://task/too-early",
    required_checks: ["lint", "unit"],
    idempotency_key: "work-too-early",
  });
  assert.equal(prematureSecond.status, "denied");
  assert.equal(prematureSecond.reason_code, "REPUTATION_LIMIT_EXCEEDED");

  const firstInput = {
    buyer_id: seed.buyerId,
    seller_id: seed.sellerId,
    authority_grant_id: seed.childAuthorityId,
    amount_minor: "500",
    task_ref: "demo://task/one",
    required_checks: ["lint", "unit"],
    idempotency_key: "work-one",
  };
  const first = await agent.createWorkOrder(firstInput);
  const replay = await agent.createWorkOrder(firstInput);
  assert.deepEqual(replay, first);
  assert.ok(first.resource);

  await assert.rejects(
    agent.createWorkOrder({ ...firstInput, amount_minor: "499" }),
    (error) =>
      error instanceof DomainError &&
      error.reasonCode === "IDEMPOTENCY_CONFLICT",
  );

  const revision = await agent.submitWork({
    work_order_id: first.resource.id,
    artifact_ref: "demo://artifact/revision",
    artifact_sha256: sha256("revision"),
    checks: [
      { name: "lint", status: "pass" },
      { name: "unit", status: "fail" },
    ],
    idempotency_key: "submission-one",
  });
  assert.equal(revision.status, "revise");
  assert.equal(revision.resource?.settlement_instruction_id, null);

  const beforePassCounts = await pool.query<{
    instruction_count: string;
    receipt_count: string;
    reputation_count: string;
  }>(`
    SELECT
      (SELECT COUNT(*)::text FROM mecharoon.settlement_instructions) AS instruction_count,
      (SELECT COUNT(*)::text FROM mecharoon.final_receipts) AS receipt_count,
      (SELECT COUNT(*)::text FROM mecharoon.reputation_events) AS reputation_count
  `);
  assert.deepEqual(beforePassCounts.rows[0], {
    instruction_count: "0",
    receipt_count: "0",
    reputation_count: "0",
  });

  const pass = await agent.submitWork({
    work_order_id: first.resource.id,
    artifact_ref: "demo://artifact/pass",
    artifact_sha256: sha256("pass"),
    checks: [
      { name: "lint", status: "pass" },
      { name: "unit", status: "pass" },
    ],
    idempotency_key: "submission-two",
  });
  assert.equal(pass.status, "final_pass");
  const instructionId = pass.resource?.settlement_instruction_id;
  assert.ok(instructionId);

  const unknownInput = {
    instruction_id: instructionId,
    scenario: "unknown",
    idempotency_key: "execute-one",
  } as const;
  const unknown = await operator.executeSettlement(unknownInput);
  const unknownReplay = await operator.executeSettlement(unknownInput);
  assert.deepEqual(unknownReplay, unknown);
  assert.equal(unknown.reason_code, "SETTLEMENT_UNKNOWN");
  assert.equal(unknown.resource?.reservation_state, "quarantined");

  const rootWhileUnknown = await queries.getAuthorityExposure(
    seed.rootAuthorityId,
  );
  assert.equal(rootWhileUnknown.reserved_minor, "500");
  assert.equal(rootWhileUnknown.settled_minor, "0");
  assert.equal(await queries.getFinalReceipt(first.resource.id), null);
  assert.equal(
    (
      await queries.getReputationView({
        subjectId: seed.sellerId,
        evaluatorPolicyHash: policyHash,
      })
    ).sample_size,
    0,
  );

  const confirmed = await operator.reconcileSettlement({
    instruction_id: instructionId,
    scenario: "confirmed",
    idempotency_key: "reconcile-one",
  });
  assert.equal(confirmed.reason_code, "SETTLEMENT_CONFIRMED");
  assert.ok(confirmed.resource?.final_receipt_id);

  const rootAfter = await queries.getAuthorityExposure(seed.rootAuthorityId);
  const childAfter = await queries.getAuthorityExposure(seed.childAuthorityId);
  assert.deepEqual(
    [rootAfter.reserved_minor, rootAfter.settled_minor],
    ["0", "500"],
  );
  assert.deepEqual(
    [childAfter.reserved_minor, childAfter.settled_minor],
    ["0", "500"],
  );

  const receipt = await queries.getFinalReceipt(first.resource.id);
  assert.ok(receipt);
  const serializedReceipt = JSON.stringify(receipt.receipt);
  assert.doesNotMatch(
    serializedReceipt,
    /normalized_check_results|api_token|simulated_signature/,
  );

  const reputation = await queries.getReputationView({
    subjectId: seed.sellerId,
    evaluatorPolicyHash: policyHash,
  });
  assert.equal(reputation.sample_size, 1);
  assert.equal(reputation.total_revision_count, 1);
  assert.equal(reputation.max_job_amount_minor, "1000");
  assert.equal(reputation.route_code, "proven_once");

  const second = await agent.createWorkOrder({
    buyer_id: seed.buyerId,
    seller_id: seed.sellerId,
    authority_grant_id: seed.childAuthorityId,
    amount_minor: "800",
    task_ref: "demo://task/two",
    required_checks: ["lint", "unit"],
    idempotency_key: "work-two",
  });
  assert.equal(second.status, "authorized");
  assert.equal(second.resource?.route_code, "proven_once");

  const replayResult = await pool.query<{
    authority_grant_id: string;
    ledger_reserved: string;
    ledger_settled: string;
    projected_reserved: string;
    projected_settled: string;
  }>(`
    SELECT
      authority.id AS authority_grant_id,
      COALESCE(SUM(ledger.delta_reserved_minor), 0)::text AS ledger_reserved,
      COALESCE(SUM(ledger.delta_settled_minor), 0)::text AS ledger_settled,
      authority.reserved_minor::text AS projected_reserved,
      authority.settled_minor::text AS projected_settled
    FROM mecharoon.authority_grants authority
    LEFT JOIN mecharoon.ledger_entries ledger
      ON ledger.authority_grant_id = authority.id
    GROUP BY authority.id
    ORDER BY authority.id
  `);
  for (const row of replayResult.rows) {
    assert.equal(row.ledger_reserved, row.projected_reserved);
    assert.equal(row.ledger_settled, row.projected_settled);
  }

  await assert.rejects(
    pool.query(
      "UPDATE mecharoon.final_receipts SET receipt_hash = 'mutated' WHERE id = $1",
      [receipt.receipt_id],
    ),
    (error: unknown) =>
      error instanceof Error &&
      (error as Error & { code?: string }).code === "55000",
  );
});

test("mismatched reconciliation remains reserved and creates no receipt or reputation", async () => {
  const runtime = createDeterministicRuntime(
    new Date("2026-07-27T00:00:00.000Z"),
  );
  const seed = await seedDemo(pool, { runtime });
  const agent = createAgentService(pool, { runtime });
  const operator = createOperatorService(pool, { runtime });
  const queries = createQueryService(pool);

  const work = await agent.createWorkOrder({
    buyer_id: seed.buyerId,
    seller_id: seed.sellerId,
    authority_grant_id: seed.childAuthorityId,
    amount_minor: "400",
    task_ref: "demo://task/mismatch",
    required_checks: ["unit"],
    idempotency_key: "mismatch-work",
  });
  assert.ok(work.resource);

  const pass = await agent.submitWork({
    work_order_id: work.resource.id,
    artifact_ref: "demo://artifact/mismatch",
    artifact_sha256: sha256("mismatch"),
    checks: [{ name: "unit", status: "pass" }],
    idempotency_key: "mismatch-submission",
  });
  assert.ok(pass.resource?.settlement_instruction_id);

  await operator.executeSettlement({
    instruction_id: pass.resource.settlement_instruction_id,
    scenario: "unknown",
    idempotency_key: "mismatch-execute",
  });
  const mismatch = await operator.reconcileSettlement({
    instruction_id: pass.resource.settlement_instruction_id,
    scenario: "mismatch",
    idempotency_key: "mismatch-reconcile",
  });
  assert.equal(mismatch.reason_code, "SETTLEMENT_MISMATCH");
  assert.equal(mismatch.resource?.reservation_state, "manual_review");

  const exposure = await queries.getAuthorityExposure(seed.rootAuthorityId);
  assert.equal(exposure.reserved_minor, "400");
  assert.equal(exposure.settled_minor, "0");
  assert.equal(await queries.getFinalReceipt(work.resource.id), null);

  const count = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM mecharoon.reputation_events",
  );
  assert.equal(count.rows[0]?.count, "0");
});

test("an expired settlement instruction cannot execute and keeps exposure reserved", async () => {
  const runtime = createDeterministicRuntime(
    new Date("2026-08-01T00:00:00.000Z"),
  );
  const seed = await seedDemo(pool, { runtime });
  const agent = createAgentService(pool, { runtime });
  const operator = createOperatorService(pool, { runtime });
  const queries = createQueryService(pool);

  const work = await agent.createWorkOrder({
    buyer_id: seed.buyerId,
    seller_id: seed.sellerId,
    authority_grant_id: seed.childAuthorityId,
    amount_minor: "300",
    task_ref: "demo://task/expired",
    required_checks: ["unit"],
    idempotency_key: "expired-work",
  });
  assert.ok(work.resource);

  const pass = await agent.submitWork({
    work_order_id: work.resource.id,
    artifact_ref: "demo://artifact/expired",
    artifact_sha256: sha256("expired"),
    checks: [{ name: "unit", status: "pass" }],
    idempotency_key: "expired-submission",
  });
  const instructionId = pass.resource?.settlement_instruction_id;
  assert.ok(instructionId);

  await pool.query(
    `
      UPDATE mecharoon.settlement_instructions
      SET expires_at = '2020-01-01T00:00:00.000Z'
      WHERE id = $1
    `,
    [instructionId],
  );

  await assert.rejects(
    operator.executeSettlement({
      instruction_id: instructionId,
      scenario: "confirmed",
      idempotency_key: "expired-execute",
    }),
    (error) =>
      error instanceof DomainError &&
      error.reasonCode === "SETTLEMENT_INSTRUCTION_EXPIRED",
  );

  const exposure = await queries.getAuthorityExposure(seed.childAuthorityId);
  assert.equal(exposure.reserved_minor, "300");
  assert.equal(exposure.settled_minor, "0");
  assert.equal(await queries.getFinalReceipt(work.resource.id), null);
});

test("a child grant cannot skip the parent delegate in its authority lineage", async () => {
  const runtime = createDeterministicRuntime(
    new Date("2026-08-02T00:00:00.000Z"),
  );
  const seed = await seedDemo(pool, { runtime });
  const agent = createAgentService(pool, { runtime });

  await pool.query(
    `
      INSERT INTO mecharoon.participants (id, kind, display_name, created_at)
      VALUES ('participant_lineage_attacker', 'buyer', 'Lineage Attacker', $1)
    `,
    [runtime.now()],
  );
  await pool.query(
    `
      INSERT INTO mecharoon.authority_grants (
        id,
        parent_id,
        principal_id,
        delegate_id,
        currency,
        domain,
        limit_minor,
        reserved_minor,
        settled_minor,
        status,
        expires_at,
        created_at
      )
      VALUES (
        'authority_bad_lineage',
        $1,
        'participant_lineage_attacker',
        $2,
        'USD',
        'coding',
        100,
        0,
        0,
        'active',
        '2027-08-02T00:00:00.000Z',
        $3
      )
    `,
    [seed.rootAuthorityId, seed.sellerId, runtime.now()],
  );

  await assert.rejects(
    agent.createWorkOrder({
      buyer_id: seed.buyerId,
      seller_id: seed.sellerId,
      authority_grant_id: "authority_bad_lineage",
      amount_minor: "100",
      task_ref: "demo://task/bad-lineage",
      required_checks: ["unit"],
      idempotency_key: "bad-lineage",
    }),
    (error) =>
      error instanceof DomainError &&
      error.reasonCode === "INVALID_DELEGATION_LINEAGE",
  );
});
