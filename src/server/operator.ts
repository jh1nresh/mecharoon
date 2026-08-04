import type { Pool, PoolClient } from "pg";

import { lockAuthorityPathRootToLeaf } from "./db/authority";
import { appendDomainEvent } from "./db/events";
import {
  claimIdempotency,
  completeIdempotency,
} from "./db/idempotency";
import { withTransaction } from "./db/transaction";
import { DomainError } from "./domain/errors";
import { sha256 } from "./domain/hash";
import type { ServiceResult } from "./domain/result";
import { systemRuntime, type Runtime } from "./domain/runtime";
import {
  executeSettlementSchema,
  reconcileSettlementSchema,
  type ExecuteSettlementInput,
  type ReconcileSettlementInput,
} from "./domain/schemas";
import { buildFinalReceipt } from "./receipts/final-receipt";
import type { SettlementResource } from "./resources";
import { createArcAdapterFromEnvironment } from "./settlement/arc-erc8183";
import {
  simulateSettlementExecution,
  simulateSettlementReconciliation,
} from "./settlement/simulated-onchain";
import { ARC_TESTNET } from "./settlement/profile";
import type {
  SettlementAdapter,
  SettlementInstruction,
  SettlementObservation,
} from "./settlement/types";

type OperatorServiceOptions = {
  runtime?: Runtime;
  arcAdapter?: SettlementAdapter;
};

type LockedSettlementRow = SettlementInstruction & {
  state: "instructed" | "submitted" | "unknown" | "confirmed" | "manual_review";
  work_order_id: string;
  reservation_id: string;
  reservation_state:
    | "held"
    | "quarantined"
    | "settled"
    | "released"
    | "manual_review";
  authority_grant_id: string;
  buyer_id: string;
  seller_id: string;
  work_state: string;
  task_ref: string;
  acceptance_policy_id: string;
  acceptance_policy_version: number;
  acceptance_policy_hash: string;
  expires_at: Date;
};

async function loadInstruction(
  pool: Pool,
  instructionId: string,
): Promise<SettlementInstruction & { state: string }> {
  const result = await pool.query<
    SettlementInstruction & {
      state: string;
    }
  >(
    `
      SELECT
        id,
        adapter,
        chain,
        instruction_hash,
        verdict_hash,
        deliverable_hash,
        amount_minor,
        asset,
        payer_id,
        payee_id,
        payer_address,
        payee_address,
        evaluator_address,
        contract_address,
        expires_at,
        state
      FROM mecharoon.settlement_instructions
      WHERE id = $1
    `,
    [instructionId],
  );
  const instruction = result.rows[0];
  if (!instruction) {
    throw new DomainError(
      404,
      "SETTLEMENT_INSTRUCTION_NOT_FOUND",
      "The settlement instruction does not exist.",
    );
  }
  return instruction;
}

async function lockSettlement(
  client: PoolClient,
  instructionId: string,
): Promise<LockedSettlementRow> {
  const result = await client.query<LockedSettlementRow>(
    `
      SELECT
        instruction.id,
        instruction.adapter,
        instruction.chain,
        instruction.instruction_hash,
        instruction.verdict_hash,
        instruction.deliverable_hash,
        instruction.amount_minor,
        instruction.asset,
        instruction.payer_id,
        instruction.payee_id,
        instruction.payer_address,
        instruction.payee_address,
        instruction.evaluator_address,
        instruction.contract_address,
        instruction.state,
        instruction.work_order_id,
        instruction.reservation_id,
        reservation.state AS reservation_state,
        reservation.authority_grant_id,
        work.buyer_id,
        work.seller_id,
        work.state AS work_state,
        work.task_ref,
        work.acceptance_policy_id,
        work.acceptance_policy_version,
        work.acceptance_policy_hash,
        instruction.expires_at
      FROM mecharoon.settlement_instructions instruction
      JOIN mecharoon.reservations reservation
        ON reservation.id = instruction.reservation_id
      JOIN mecharoon.work_orders work
        ON work.id = instruction.work_order_id
      WHERE instruction.id = $1
      FOR UPDATE OF instruction, reservation, work
    `,
    [instructionId],
  );
  const row = result.rows[0];
  if (!row) {
    throw new DomainError(
      404,
      "SETTLEMENT_INSTRUCTION_NOT_FOUND",
      "The settlement instruction does not exist.",
    );
  }
  return row;
}

async function loadSettlementResource(
  client: PoolClient,
  instruction: LockedSettlementRow,
): Promise<SettlementResource> {
  const result = await client.query<{
    tx_hash: string | null;
    receipt_id: string | null;
  }>(
    `
      SELECT
        (
          SELECT tx_hash
          FROM mecharoon.onchain_settlement_records
          WHERE instruction_id = $1
            AND state = 'confirmed'
          ORDER BY observed_at DESC, id DESC
          LIMIT 1
        ) AS tx_hash,
        (
          SELECT id
          FROM mecharoon.final_receipts
          WHERE work_order_id = $2
          ORDER BY version DESC
          LIMIT 1
        ) AS receipt_id
    `,
    [instruction.id, instruction.work_order_id],
  );

  return {
    instruction_id: instruction.id,
    work_order_id: instruction.work_order_id,
    reservation_id: instruction.reservation_id,
    settlement_state: instruction.state,
    reservation_state: instruction.reservation_state,
    tx_hash: result.rows[0]?.tx_hash ?? null,
    final_receipt_id: result.rows[0]?.receipt_id ?? null,
  };
}

function resultForCurrentState(
  resource: SettlementResource,
): ServiceResult<SettlementResource> {
  if (resource.settlement_state === "confirmed") {
    return {
      status: "complete",
      reason_code: "SETTLEMENT_CONFIRMED",
      next_actions: [],
      resource,
    };
  }
  if (resource.settlement_state === "manual_review") {
    return {
      status: "manual_review",
      reason_code: "SETTLEMENT_MISMATCH",
      next_actions: [{ action: "review_settlement_mismatch" }],
      resource,
    };
  }
  if (resource.settlement_state === "unknown") {
    return {
      status: "settlement_unknown",
      reason_code: "SETTLEMENT_UNKNOWN",
      next_actions: [{ action: "reconcile_settlement" }],
      resource,
    };
  }
  return {
    status: "settlement_instructed",
    reason_code: "SETTLEMENT_INSTRUCTED",
    next_actions: [{ action: "execute_settlement" }],
    resource,
  };
}

function observationMatchesInstruction(
  observation: SettlementObservation,
  instruction: LockedSettlementRow,
): boolean {
  const localFieldsMatch =
    observation.state === "confirmed" &&
    observation.txHash !== null &&
    observation.amountMinor === BigInt(instruction.amount_minor).toString() &&
    observation.asset === instruction.asset &&
    observation.payerId === instruction.payer_id &&
    observation.payeeId === instruction.payee_id;
  if (!localFieldsMatch) {
    return false;
  }
  if (instruction.adapter === "simulated_onchain_v0") {
    return true;
  }
  return (
    observation.amountAtomic ===
      (BigInt(instruction.amount_minor) * BigInt(10_000)).toString() &&
    observation.chainId === ARC_TESTNET.chainId &&
    observation.externalJobId !== null &&
    observation.externalStatus === "3" &&
    observation.payerAddress?.toLowerCase() ===
      instruction.payer_address?.toLowerCase() &&
    observation.payeeAddress?.toLowerCase() ===
      instruction.payee_address?.toLowerCase() &&
    observation.evaluatorAddress?.toLowerCase() ===
      instruction.evaluator_address?.toLowerCase() &&
    observation.contractAddress?.toLowerCase() ===
      instruction.contract_address?.toLowerCase() &&
    observation.explorerUrl !== null
  );
}

async function insertSettlementRecord(
  client: PoolClient,
  runtime: Runtime,
  instruction: LockedSettlementRow,
  observation: SettlementObservation,
  state: "unknown" | "confirmed" | "mismatch" | "failed",
): Promise<boolean> {
  const inserted = await client.query(
    `
      INSERT INTO mecharoon.onchain_settlement_records (
        id,
        instruction_id,
        adapter_event_id,
        state,
        tx_hash,
        observed_amount_minor,
        observed_asset,
        observed_payer_id,
        observed_payee_id,
        observed_amount_atomic,
        observed_payer_address,
        observed_payee_address,
        observed_evaluator_address,
        observed_chain_id,
        observed_contract_address,
        external_job_id,
        external_status,
        explorer_url,
        transaction_hashes,
        observed_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, $20
      )
      ON CONFLICT (adapter_event_id) DO NOTHING
    `,
    [
      runtime.id("settlement"),
      instruction.id,
      observation.adapterEventId,
      state,
      observation.txHash,
      observation.amountMinor,
      observation.asset,
      observation.payerId,
      observation.payeeId,
      observation.amountAtomic,
      observation.payerAddress,
      observation.payeeAddress,
      observation.evaluatorAddress,
      observation.chainId,
      observation.contractAddress,
      observation.externalJobId,
      observation.externalStatus,
      observation.explorerUrl,
      JSON.stringify(observation.transactionHashes),
      runtime.now(),
    ],
  );
  return inserted.rowCount === 1;
}

async function applyObservation(
  client: PoolClient,
  runtime: Runtime,
  instruction: LockedSettlementRow,
  observation: SettlementObservation,
): Promise<ServiceResult<SettlementResource>> {
  const matches =
    observation.state === "unknown" ||
    observationMatchesInstruction(observation, instruction);
  const normalizedState =
    observation.state === "unknown"
      ? "unknown"
      : observation.state === "failed"
        ? "failed"
        : matches
          ? "confirmed"
          : "mismatch";

  const inserted = await insertSettlementRecord(
    client,
    runtime,
    instruction,
    observation,
    normalizedState,
  );
  if (!inserted) {
    return resultForCurrentState(
      await loadSettlementResource(client, instruction),
    );
  }

  if (normalizedState === "unknown") {
    await client.query(
      `
        UPDATE mecharoon.settlement_instructions
        SET state = 'unknown', updated_at = $2
        WHERE id = $1
      `,
      [instruction.id, runtime.now()],
    );
    await client.query(
      `
        UPDATE mecharoon.reservations
        SET state = 'quarantined', updated_at = $2
        WHERE id = $1
      `,
      [instruction.reservation_id, runtime.now()],
    );
    await client.query(
      `
        UPDATE mecharoon.work_orders
        SET state = 'settlement_unknown', updated_at = $2
        WHERE id = $1
      `,
      [instruction.work_order_id, runtime.now()],
    );

    await appendDomainEvent(client, runtime, {
      aggregateType: "settlement_instruction",
      aggregateId: instruction.id,
      eventType: "settlement_unknown",
      payload: {
        adapter_event_id: observation.adapterEventId,
        reservation_id: instruction.reservation_id,
        exposure_action: "held",
      },
    });

    return {
      status: "settlement_unknown",
      reason_code: "SETTLEMENT_UNKNOWN",
      next_actions: [{ action: "reconcile_settlement" }],
      resource: {
        instruction_id: instruction.id,
        work_order_id: instruction.work_order_id,
        reservation_id: instruction.reservation_id,
        settlement_state: "unknown",
        reservation_state: "quarantined",
        tx_hash: null,
        final_receipt_id: null,
      },
    };
  }

  if (normalizedState === "failed") {
    await client.query(
      `
        UPDATE mecharoon.settlement_instructions
        SET state = 'manual_review', updated_at = $2
        WHERE id = $1
      `,
      [instruction.id, runtime.now()],
    );
    await client.query(
      `
        UPDATE mecharoon.reservations
        SET state = 'manual_review', updated_at = $2
        WHERE id = $1
      `,
      [instruction.reservation_id, runtime.now()],
    );
    await client.query(
      `
        UPDATE mecharoon.work_orders
        SET state = 'manual_review', updated_at = $2
        WHERE id = $1
      `,
      [instruction.work_order_id, runtime.now()],
    );

    await appendDomainEvent(client, runtime, {
      aggregateType: "settlement_instruction",
      aggregateId: instruction.id,
      eventType: "settlement_step_failed",
      payload: {
        adapter_event_id: observation.adapterEventId,
        external_status: observation.externalStatus,
        external_job_id: observation.externalJobId,
        transaction_hashes: observation.transactionHashes,
      },
    });

    return {
      status: "manual_review",
      reason_code: "SETTLEMENT_STEP_FAILED",
      next_actions: [{ action: "review_settlement_failure" }],
      resource: {
        instruction_id: instruction.id,
        work_order_id: instruction.work_order_id,
        reservation_id: instruction.reservation_id,
        settlement_state: "manual_review",
        reservation_state: "manual_review",
        tx_hash: null,
        final_receipt_id: null,
      },
    };
  }

  if (normalizedState === "mismatch") {
    await client.query(
      `
        UPDATE mecharoon.settlement_instructions
        SET state = 'manual_review', updated_at = $2
        WHERE id = $1
      `,
      [instruction.id, runtime.now()],
    );
    await client.query(
      `
        UPDATE mecharoon.reservations
        SET state = 'manual_review', updated_at = $2
        WHERE id = $1
      `,
      [instruction.reservation_id, runtime.now()],
    );
    await client.query(
      `
        UPDATE mecharoon.work_orders
        SET state = 'manual_review', updated_at = $2
        WHERE id = $1
      `,
      [instruction.work_order_id, runtime.now()],
    );

    await appendDomainEvent(client, runtime, {
      aggregateType: "settlement_instruction",
      aggregateId: instruction.id,
      eventType: "settlement_mismatch",
      payload: {
        adapter_event_id: observation.adapterEventId,
        expected: {
          amount_minor: BigInt(instruction.amount_minor).toString(),
          asset: instruction.asset,
          payer_id: instruction.payer_id,
          payee_id: instruction.payee_id,
          amount_atomic:
            instruction.adapter === "arc_testnet_erc8183_v0"
              ? (BigInt(instruction.amount_minor) * BigInt(10_000)).toString()
              : null,
          payer_address: instruction.payer_address,
          payee_address: instruction.payee_address,
          evaluator_address: instruction.evaluator_address,
          chain_id:
            instruction.adapter === "arc_testnet_erc8183_v0"
              ? ARC_TESTNET.chainId
              : null,
          contract_address: instruction.contract_address,
        },
        observed: {
          amount_minor: observation.amountMinor,
          asset: observation.asset,
          payer_id: observation.payerId,
          payee_id: observation.payeeId,
          amount_atomic: observation.amountAtomic,
          payer_address: observation.payerAddress,
          payee_address: observation.payeeAddress,
          evaluator_address: observation.evaluatorAddress,
          chain_id: observation.chainId,
          contract_address: observation.contractAddress,
          external_job_id: observation.externalJobId,
          external_status: observation.externalStatus,
        },
      },
    });

    return {
      status: "manual_review",
      reason_code: "SETTLEMENT_MISMATCH",
      next_actions: [{ action: "review_settlement_mismatch" }],
      resource: {
        instruction_id: instruction.id,
        work_order_id: instruction.work_order_id,
        reservation_id: instruction.reservation_id,
        settlement_state: "manual_review",
        reservation_state: "manual_review",
        tx_hash: observation.txHash,
        final_receipt_id: null,
      },
    };
  }

  if (!observation.txHash) {
    throw new DomainError(
      409,
      "SETTLEMENT_MISSING_TX_HASH",
      "A confirmed settlement must include a transaction hash.",
    );
  }

  const authorityPath = await lockAuthorityPathRootToLeaf(
    client,
    instruction.authority_grant_id,
  );
  const amountMinor = BigInt(instruction.amount_minor);
  const ledgerEventId = runtime.id("ledger_event");
  const settledAt = runtime.now();

  for (const grant of authorityPath) {
    const updated = await client.query(
      `
        UPDATE mecharoon.authority_grants
        SET reserved_minor = reserved_minor - $2,
            settled_minor = settled_minor + $2
        WHERE id = $1
          AND reserved_minor >= $2
      `,
      [grant.id, amountMinor.toString()],
    );
    if (updated.rowCount !== 1) {
      throw new DomainError(
        409,
        "RESERVATION_LEDGER_MISMATCH",
        "The reserved exposure cannot cover the confirmed settlement.",
        { authority_grant_id: grant.id },
      );
    }

    await client.query(
      `
        INSERT INTO mecharoon.ledger_entries (
          id,
          event_id,
          authority_grant_id,
          reservation_id,
          event_type,
          delta_reserved_minor,
          delta_settled_minor,
          created_at
        )
        VALUES ($1, $2, $3, $4, 'settle', $5, $6, $7)
      `,
      [
        runtime.id("ledger"),
        ledgerEventId,
        grant.id,
        instruction.reservation_id,
        (-amountMinor).toString(),
        amountMinor.toString(),
        settledAt,
      ],
    );
  }

  await client.query(
    `
      UPDATE mecharoon.settlement_instructions
      SET state = 'confirmed', external_job_id = $2, updated_at = $3
      WHERE id = $1
    `,
    [instruction.id, observation.externalJobId, settledAt],
  );
  await client.query(
    `
      UPDATE mecharoon.reservations
      SET state = 'settled', updated_at = $2
      WHERE id = $1
    `,
    [instruction.reservation_id, settledAt],
  );
  await client.query(
    `
      UPDATE mecharoon.work_orders
      SET state = 'complete', updated_at = $2
      WHERE id = $1
    `,
    [instruction.work_order_id, settledAt],
  );

  const submissionResult = await client.query<{
    artifact_ref: string;
    artifact_sha256: string;
    sequence: number;
    reason_codes: string[];
    evaluator_policy_hash: string;
  }>(
    `
      SELECT
        submission.artifact_ref,
        submission.artifact_sha256,
        submission.sequence,
        verdict.reason_codes,
        verdict.evaluator_policy_hash
      FROM mecharoon.submissions submission
      JOIN mecharoon.verdicts verdict
        ON verdict.submission_id = submission.id
      WHERE submission.work_order_id = $1
        AND verdict.outcome = 'pass'
      ORDER BY submission.sequence DESC
      LIMIT 1
    `,
    [instruction.work_order_id],
  );
  const submission = submissionResult.rows[0];
  if (!submission) {
    throw new DomainError(
      409,
      "FINAL_VERDICT_MISSING",
      "A confirmed settlement requires a passing final verdict.",
    );
  }

  const revisionResult = await client.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM mecharoon.verdicts verdict
      JOIN mecharoon.submissions submission
        ON submission.id = verdict.submission_id
      WHERE submission.work_order_id = $1
        AND verdict.outcome = 'revise'
    `,
    [instruction.work_order_id],
  );
  const revisionCount = Number(revisionResult.rows[0]?.count ?? "0");
  const receiptId = runtime.id("receipt");
  const { receipt, receiptHash } = buildFinalReceipt({
    receiptId,
    workOrder: {
      id: instruction.work_order_id,
      buyer_id: instruction.buyer_id,
      seller_id: instruction.seller_id,
      authority_grant_id: instruction.authority_grant_id,
      amount_minor: amountMinor.toString(),
      task_ref: instruction.task_ref,
      acceptance_policy_id: instruction.acceptance_policy_id,
      acceptance_policy_version: instruction.acceptance_policy_version,
      acceptance_policy_hash: instruction.acceptance_policy_hash,
    },
    authorityLineage: authorityPath.map((grant) => grant.id),
    reservationId: instruction.reservation_id,
    submission,
    verdict: submission,
    revisionCount,
    instruction: {
      id: instruction.id,
      instruction_hash: instruction.instruction_hash,
      amount_minor: amountMinor.toString(),
      payer_id: instruction.payer_id,
      payee_id: instruction.payee_id,
      adapter: instruction.adapter,
      chain: instruction.chain,
      amount_atomic: observation.amountAtomic,
      payer_address: observation.payerAddress,
      payee_address: observation.payeeAddress,
      evaluator_address: observation.evaluatorAddress,
      chain_id: observation.chainId,
      contract_address: observation.contractAddress,
      external_job_id: observation.externalJobId,
      external_status: observation.externalStatus,
      explorer_url: observation.explorerUrl,
      transaction_hashes: observation.transactionHashes,
    },
    txHash: observation.txHash,
    finalizedAt: settledAt,
  });

  await client.query(
    `
      INSERT INTO mecharoon.final_receipts (
        id,
        work_order_id,
        version,
        receipt,
        receipt_hash,
        supersedes_id,
        created_at
      )
      VALUES ($1, $2, 1, $3::jsonb, $4, NULL, $5)
    `,
    [
      receiptId,
      instruction.work_order_id,
      JSON.stringify(receipt),
      receiptHash,
      settledAt,
    ],
  );

  await client.query(
    `
      INSERT INTO mecharoon.reputation_events (
        id,
        final_receipt_id,
        subject_id,
        transaction_role,
        domain,
        evaluator_policy_hash,
        proof_level,
        outcome,
        revision_count,
        created_at
      )
      VALUES (
        $1, $2, $3, 'seller', 'coding', $4,
        $5, 'pass', $6, $7
      )
    `,
    [
      runtime.id("rep"),
      receiptId,
      instruction.seller_id,
      submission.evaluator_policy_hash,
      instruction.adapter === "arc_testnet_erc8183_v0"
        ? "arc_testnet_erc8183_confirmed"
        : "simulated_onchain_confirmed",
      revisionCount,
      settledAt,
    ],
  );

  await appendDomainEvent(client, runtime, {
    aggregateType: "work_order",
    aggregateId: instruction.work_order_id,
    eventType: "work_finalized",
    payload: {
      settlement_instruction_id: instruction.id,
      settlement_tx_hash: observation.txHash,
      final_receipt_id: receiptId,
      receipt_hash: receiptHash,
      reputation_subject_id: instruction.seller_id,
    },
  });

  return {
    status: "complete",
    reason_code: "SETTLEMENT_CONFIRMED",
    next_actions: [],
    resource: {
      instruction_id: instruction.id,
      work_order_id: instruction.work_order_id,
      reservation_id: instruction.reservation_id,
      settlement_state: "confirmed",
      reservation_state: "settled",
      tx_hash: observation.txHash,
      final_receipt_id: receiptId,
    },
  };
}

export function createOperatorService(
  pool: Pool,
  options: OperatorServiceOptions = {},
) {
  const runtime = options.runtime ?? systemRuntime;

  function arcAdapter(): SettlementAdapter {
    return options.arcAdapter ?? createArcAdapterFromEnvironment();
  }

  async function applyOperatorObservation(input: {
    instructionId: string;
    idempotencyKey: string;
    requestHash: string;
    scope: string;
    observation: SettlementObservation;
    operation: "execute" | "reconcile";
  }): Promise<ServiceResult<SettlementResource>> {
    return withTransaction(pool, async (client) => {
      const claimed = await claimIdempotency<SettlementResource>(client, {
        scope: input.scope,
        key: input.idempotencyKey,
        requestHash: input.requestHash,
        now: runtime.now(),
      });
      if (!claimed.claimed) {
        return claimed.response;
      }

      const instruction = await lockSettlement(client, input.instructionId);
      if (
        instruction.state === "confirmed" ||
        instruction.state === "manual_review" ||
        (input.operation === "execute" && instruction.state === "unknown")
      ) {
        const response = resultForCurrentState(
          await loadSettlementResource(client, instruction),
        );
        await completeIdempotency(client, {
          scope: input.scope,
          key: input.idempotencyKey,
          responseStatus: 200,
          response,
          resourceId: instruction.id,
          now: runtime.now(),
        });
        return response;
      }

      if (
        input.operation === "execute" &&
        instruction.expires_at.getTime() <= runtime.now().getTime()
      ) {
        throw new DomainError(
          422,
          "SETTLEMENT_INSTRUCTION_EXPIRED",
          "The reservation-bound settlement instruction has expired.",
        );
      }

      if (
        input.operation === "reconcile" &&
        instruction.state !== "unknown"
      ) {
        throw new DomainError(
          409,
          "INVALID_SETTLEMENT_TRANSITION",
          "Only an unknown settlement may be reconciled.",
          { state: instruction.state },
        );
      }

      const response = await applyObservation(
        client,
        runtime,
        instruction,
        input.observation,
      );
      await completeIdempotency(client, {
        scope: input.scope,
        key: input.idempotencyKey,
        responseStatus: response.status === "manual_review" ? 409 : 200,
        response,
        resourceId: instruction.id,
        now: runtime.now(),
      });
      return response;
    });
  }

  return {
    async executeSettlement(
      unsafeInput: ExecuteSettlementInput,
    ): Promise<ServiceResult<SettlementResource>> {
      const parsed = executeSettlementSchema.parse(unsafeInput);
      const instruction = await loadInstruction(pool, parsed.instruction_id);
      const requestHash = sha256({
        instruction_id: parsed.instruction_id,
        scenario: parsed.scenario,
      });
      const observation =
        instruction.state === "confirmed" ||
        instruction.state === "manual_review" ||
        instruction.state === "unknown"
          ? simulateSettlementExecution(instruction, "unknown")
          : instruction.adapter === "arc_testnet_erc8183_v0"
            ? await arcAdapter().execute(instruction)
            : simulateSettlementExecution(instruction, parsed.scenario);
      return applyOperatorObservation({
        instructionId: parsed.instruction_id,
        idempotencyKey: parsed.idempotency_key,
        requestHash,
        scope: `execute_settlement:${parsed.instruction_id}`,
        observation,
        operation: "execute",
      });
    },

    async reconcileSettlement(
      unsafeInput: ReconcileSettlementInput,
    ): Promise<ServiceResult<SettlementResource>> {
      const parsed = reconcileSettlementSchema.parse(unsafeInput);
      const instruction = await loadInstruction(pool, parsed.instruction_id);
      const requestHash = sha256({
        instruction_id: parsed.instruction_id,
        scenario: parsed.scenario,
      });
      const observation =
        instruction.state === "confirmed" ||
        instruction.state === "manual_review"
          ? simulateSettlementExecution(instruction, "unknown")
          : instruction.adapter === "arc_testnet_erc8183_v0"
            ? await arcAdapter().reconcile(instruction)
            : simulateSettlementReconciliation(instruction, parsed.scenario);
      return applyOperatorObservation({
        instructionId: parsed.instruction_id,
        idempotencyKey: parsed.idempotency_key,
        requestHash,
        scope: `reconcile_settlement:${parsed.instruction_id}`,
        observation,
        operation: "reconcile",
      });
    },
  };
}
