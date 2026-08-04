import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import { getAddress } from "viem";

import { createAgentService } from "../../src/server/agent";
import { createPool } from "../../src/server/db/pool";
import { sha256 } from "../../src/server/domain/hash";
import { createDeterministicRuntime } from "../../src/server/domain/runtime";
import { codingPolicyHash } from "../../src/server/evaluation/coding-v0";
import { createOperatorService } from "../../src/server/operator";
import { createQueryService } from "../../src/server/queries";
import { ARC_TESTNET, type ArcSettlementProfile } from "../../src/server/settlement/profile";
import type { SettlementAdapter, SettlementObservation } from "../../src/server/settlement/types";
import { seedDemo } from "../../src/server/setup";
import { resetOwnedTables } from "./test-db";

const pool = createPool({ max: 10 });

after(async () => {
  await pool.end();
});

beforeEach(async () => {
  await resetOwnedTables(pool);
});

test("Arc unknown evidence stays reserved until matching completion creates the receipt", async () => {
  const runtime = createDeterministicRuntime(new Date("2026-08-03T00:00:00.000Z"));
  const seed = await seedDemo(pool, { runtime });
  const payerAddress = getAddress("0x1111111111111111111111111111111111111111");
  const payeeAddress = getAddress("0x2222222222222222222222222222222222222222");
  const evaluatorAddress = getAddress("0x3333333333333333333333333333333333333333");
  const contractAddress = getAddress(ARC_TESTNET.erc8183Address);
  const profile: ArcSettlementProfile = {
    adapter: "arc_testnet_erc8183_v0",
    chain: "arc_testnet",
    audience: "arc-testnet-erc8183-v0",
    buyerId: seed.buyerId,
    sellerId: seed.sellerId,
    payerAddress,
    payeeAddress,
    evaluatorAddress,
    contractAddress,
  };
  const unknown: SettlementObservation = {
    adapterEventId: "arc_evt_pending",
    state: "unknown",
    txHash: null,
    amountMinor: null,
    amountAtomic: null,
    asset: null,
    payerId: null,
    payeeId: null,
    payerAddress: null,
    payeeAddress: null,
    evaluatorAddress: null,
    chainId: ARC_TESTNET.chainId,
    contractAddress,
    externalJobId: "7",
    externalStatus: "fund:queued",
    explorerUrl: null,
    transactionHashes: [],
  };
  const completionHash = `0x${"d".repeat(64)}`;
  const confirmed: SettlementObservation = {
    adapterEventId: "arc_evt_confirmed",
    state: "confirmed",
    txHash: completionHash,
    amountMinor: "500",
    amountAtomic: "5000000",
    asset: "USDC",
    payerId: seed.buyerId,
    payeeId: seed.sellerId,
    payerAddress,
    payeeAddress,
    evaluatorAddress,
    chainId: ARC_TESTNET.chainId,
    contractAddress,
    externalJobId: "7",
    externalStatus: "3",
    explorerUrl: `${ARC_TESTNET.explorerUrl}/tx/${completionHash}`,
    transactionHashes: [completionHash],
  };
  const adapter: SettlementAdapter = {
    name: "arc_testnet_erc8183_v0",
    async execute() {
      return unknown;
    },
    async reconcile() {
      return confirmed;
    },
  };
  const agent = createAgentService(pool, { runtime, settlementProfile: profile });
  const operator = createOperatorService(pool, { runtime, arcAdapter: adapter });
  const queries = createQueryService(pool);

  const work = await agent.createWorkOrder({
    buyer_id: seed.buyerId,
    seller_id: seed.sellerId,
    authority_grant_id: seed.childAuthorityId,
    amount_minor: "500",
    task_ref: "demo://arc/task",
    required_checks: ["unit"],
    idempotency_key: "arc-work",
  });
  assert.ok(work.resource);
  const pass = await agent.submitWork({
    work_order_id: work.resource.id,
    artifact_ref: "demo://arc/artifact",
    artifact_sha256: sha256("arc artifact"),
    checks: [{ name: "unit", status: "pass" }],
    idempotency_key: "arc-submission",
  });
  const instructionId = pass.resource?.settlement_instruction_id;
  assert.ok(instructionId);

  const instruction = await pool.query<{
    adapter: string;
    chain: string;
    simulated_signature: string | null;
    deliverable_hash: string;
  }>(
    "SELECT adapter, chain, simulated_signature, deliverable_hash FROM mecharoon.settlement_instructions WHERE id = $1",
    [instructionId],
  );
  assert.deepEqual(instruction.rows[0], {
    adapter: "arc_testnet_erc8183_v0",
    chain: "arc_testnet",
    simulated_signature: null,
    deliverable_hash: sha256("arc artifact"),
  });

  const pending = await operator.executeSettlement({
    instruction_id: instructionId,
    scenario: "confirmed",
    idempotency_key: "arc-execute",
  });
  assert.equal(pending.status, "settlement_unknown");
  assert.equal((await queries.getAuthorityExposure(seed.rootAuthorityId)).reserved_minor, "500");
  assert.equal(await queries.getFinalReceipt(work.resource.id), null);

  const finalized = await operator.reconcileSettlement({
    instruction_id: instructionId,
    scenario: "confirmed",
    idempotency_key: "arc-reconcile",
  });
  assert.equal(finalized.status, "complete");
  const receipt = await queries.getFinalReceipt(work.resource.id);
  assert.ok(receipt);
  const settlement = receipt.receipt.settlement as Record<string, unknown>;
  assert.equal(settlement.adapter, "arc_testnet_erc8183_v0");
  assert.equal(settlement.external_job_id, "7");
  assert.equal(settlement.amount_atomic, "5000000");
  assert.equal(settlement.explorer_url, confirmed.explorerUrl);

  const reputation = await queries.getReputationView({
    subjectId: seed.sellerId,
    evaluatorPolicyHash: codingPolicyHash(["unit"]),
  });
  assert.equal(reputation.sample_size, 1);
  assert.equal(reputation.max_job_amount_minor, "1000");
});

test("a terminally failed Arc step routes to manual review instead of permanent quarantine", async () => {
  const runtime = createDeterministicRuntime(new Date("2026-08-04T00:00:00.000Z"));
  const seed = await seedDemo(pool, { runtime });
  const contractAddress = getAddress(ARC_TESTNET.erc8183Address);
  const profile: ArcSettlementProfile = {
    adapter: "arc_testnet_erc8183_v0",
    chain: "arc_testnet",
    audience: "arc-testnet-erc8183-v0",
    buyerId: seed.buyerId,
    sellerId: seed.sellerId,
    payerAddress: getAddress("0x1111111111111111111111111111111111111111"),
    payeeAddress: getAddress("0x2222222222222222222222222222222222222222"),
    evaluatorAddress: getAddress("0x3333333333333333333333333333333333333333"),
    contractAddress,
  };
  const failed: SettlementObservation = {
    adapterEventId: "arc_evt_failed",
    state: "failed",
    txHash: null,
    amountMinor: null,
    amountAtomic: null,
    asset: null,
    payerId: null,
    payeeId: null,
    payerAddress: null,
    payeeAddress: null,
    evaluatorAddress: null,
    chainId: ARC_TESTNET.chainId,
    contractAddress,
    externalJobId: "7",
    externalStatus: "approve:failed",
    explorerUrl: null,
    transactionHashes: [],
  };
  const adapter: SettlementAdapter = {
    name: "arc_testnet_erc8183_v0",
    async execute() {
      return failed;
    },
    async reconcile() {
      return failed;
    },
  };
  const agent = createAgentService(pool, { runtime, settlementProfile: profile });
  const operator = createOperatorService(pool, { runtime, arcAdapter: adapter });
  const queries = createQueryService(pool);

  const work = await agent.createWorkOrder({
    buyer_id: seed.buyerId,
    seller_id: seed.sellerId,
    authority_grant_id: seed.childAuthorityId,
    amount_minor: "500",
    task_ref: "demo://arc/failed-task",
    required_checks: ["unit"],
    idempotency_key: "arc-failed-work",
  });
  assert.ok(work.resource);
  const pass = await agent.submitWork({
    work_order_id: work.resource.id,
    artifact_ref: "demo://arc/failed-artifact",
    artifact_sha256: sha256("arc failed artifact"),
    checks: [{ name: "unit", status: "pass" }],
    idempotency_key: "arc-failed-submission",
  });
  const instructionId = pass.resource?.settlement_instruction_id;
  assert.ok(instructionId);

  const outcome = await operator.executeSettlement({
    instruction_id: instructionId,
    scenario: "confirmed",
    idempotency_key: "arc-failed-execute",
  });
  assert.equal(outcome.status, "manual_review");
  assert.equal(outcome.reason_code, "SETTLEMENT_STEP_FAILED");
  assert.equal(outcome.resource?.settlement_state, "manual_review");
  assert.equal(outcome.resource?.reservation_state, "manual_review");

  const states = await pool.query<{instruction: string; reservation: string; work_order: string}>(
    `
      SELECT si.state AS instruction, r.state AS reservation, wo.state AS work_order
      FROM mecharoon.settlement_instructions si
      JOIN mecharoon.reservations r ON r.id = si.reservation_id
      JOIN mecharoon.work_orders wo ON wo.id = si.work_order_id
      WHERE si.id = $1
    `,
    [instructionId],
  );
  assert.deepEqual(states.rows[0], {
    instruction: "manual_review",
    reservation: "manual_review",
    work_order: "manual_review",
  });
  assert.equal(await queries.getFinalReceipt(work.resource.id), null);

  const events = await pool.query<{event_type: string}>(
    `
      SELECT event_type FROM mecharoon.domain_events
      WHERE aggregate_id = $1 AND event_type = 'settlement_step_failed'
    `,
    [instructionId],
  );
  assert.equal(events.rows.length, 1);
});
