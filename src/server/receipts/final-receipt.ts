import { sha256 } from "../domain/hash";

export type FinalReceiptDocument = {
  schema_version: "mecharoon.final-receipt.v0";
  receipt_id: string;
  work_order: {
    id: string;
    buyer_id: string;
    seller_id: string;
    domain: "coding";
    task_ref: string;
    amount_minor: string;
    currency: "USD";
    acceptance_policy_id: string;
    acceptance_policy_version: number;
    acceptance_policy_hash: string;
  };
  authority: {
    leaf_grant_id: string;
    lineage: string[];
    reservation_id: string;
  };
  submission: {
    artifact_ref: string;
    artifact_sha256: string;
    sequence: number;
  };
  verdict: {
    outcome: "pass";
    reason_codes: string[];
    evaluator_policy_hash: string;
    revision_count: number;
  };
  settlement: {
    instruction_id: string;
    instruction_hash: string;
    adapter: "simulated_onchain_v0";
    chain: "simulated";
    asset: "USDC";
    amount_minor: string;
    payer_id: string;
    payee_id: string;
    tx_hash: string;
    finality: "simulated_confirmed";
  };
  finalized_at: string;
};

export function buildFinalReceipt(input: {
  receiptId: string;
  workOrder: {
    id: string;
    buyer_id: string;
    seller_id: string;
    authority_grant_id: string;
    amount_minor: string;
    task_ref: string;
    acceptance_policy_id: string;
    acceptance_policy_version: number;
    acceptance_policy_hash: string;
  };
  authorityLineage: string[];
  reservationId: string;
  submission: {
    artifact_ref: string;
    artifact_sha256: string;
    sequence: number;
  };
  verdict: {
    reason_codes: string[];
    evaluator_policy_hash: string;
  };
  revisionCount: number;
  instruction: {
    id: string;
    instruction_hash: string;
    amount_minor: string;
    payer_id: string;
    payee_id: string;
  };
  txHash: string;
  finalizedAt: Date;
}): { receipt: FinalReceiptDocument; receiptHash: string } {
  const receipt: FinalReceiptDocument = {
    schema_version: "mecharoon.final-receipt.v0",
    receipt_id: input.receiptId,
    work_order: {
      id: input.workOrder.id,
      buyer_id: input.workOrder.buyer_id,
      seller_id: input.workOrder.seller_id,
      domain: "coding",
      task_ref: input.workOrder.task_ref,
      amount_minor: input.workOrder.amount_minor,
      currency: "USD",
      acceptance_policy_id: input.workOrder.acceptance_policy_id,
      acceptance_policy_version: input.workOrder.acceptance_policy_version,
      acceptance_policy_hash: input.workOrder.acceptance_policy_hash,
    },
    authority: {
      leaf_grant_id: input.workOrder.authority_grant_id,
      lineage: input.authorityLineage,
      reservation_id: input.reservationId,
    },
    submission: {
      artifact_ref: input.submission.artifact_ref,
      artifact_sha256: input.submission.artifact_sha256,
      sequence: input.submission.sequence,
    },
    verdict: {
      outcome: "pass",
      reason_codes: input.verdict.reason_codes,
      evaluator_policy_hash: input.verdict.evaluator_policy_hash,
      revision_count: input.revisionCount,
    },
    settlement: {
      instruction_id: input.instruction.id,
      instruction_hash: input.instruction.instruction_hash,
      adapter: "simulated_onchain_v0",
      chain: "simulated",
      asset: "USDC",
      amount_minor: input.instruction.amount_minor,
      payer_id: input.instruction.payer_id,
      payee_id: input.instruction.payee_id,
      tx_hash: input.txHash,
      finality: "simulated_confirmed",
    },
    finalized_at: input.finalizedAt.toISOString(),
  };

  return {
    receipt,
    receiptHash: sha256(receipt),
  };
}
