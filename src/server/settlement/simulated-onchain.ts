import { sha256 } from "../domain/hash";
import type { SettlementInstruction, SettlementObservation } from "./types";

function eventId(instructionId: string, phase: "execute" | "reconcile"): string {
  return `sim_evt_${sha256({ instruction_id: instructionId, phase }).slice(0, 32)}`;
}

function transactionHash(instructionHash: string): string {
  return `0x${sha256({
    simulated_transaction_for: instructionHash,
  })}`;
}

export function simulateSettlementExecution(
  instruction: SettlementInstruction,
  scenario: "confirmed" | "unknown",
): SettlementObservation {
  if (scenario === "unknown") {
    return {
      adapterEventId: eventId(instruction.id, "execute"),
      state: "unknown",
      txHash: null,
      amountMinor: null,
      asset: null,
      payerId: null,
      payeeId: null,
      payerAddress: null,
      payeeAddress: null,
      evaluatorAddress: null,
      amountAtomic: null,
      chainId: null,
      contractAddress: null,
      externalJobId: null,
      externalStatus: null,
      explorerUrl: null,
      transactionHashes: [],
    };
  }

  return {
    adapterEventId: eventId(instruction.id, "execute"),
    state: "confirmed",
    txHash: transactionHash(instruction.instruction_hash),
    amountMinor: instruction.amount_minor,
    asset: instruction.asset,
    payerId: instruction.payer_id,
    payeeId: instruction.payee_id,
    payerAddress: null,
    payeeAddress: null,
    evaluatorAddress: null,
    amountAtomic: null,
    chainId: null,
    contractAddress: null,
    externalJobId: null,
    externalStatus: "simulated_confirmed",
    explorerUrl: null,
    transactionHashes: [transactionHash(instruction.instruction_hash)],
  };
}

export function simulateSettlementReconciliation(
  instruction: SettlementInstruction,
  scenario: "confirmed" | "mismatch",
): SettlementObservation {
  const confirmed = {
    adapterEventId: eventId(instruction.id, "reconcile"),
    state: "confirmed" as const,
    txHash: transactionHash(instruction.instruction_hash),
    amountMinor: instruction.amount_minor,
    asset: instruction.asset,
    payerId: instruction.payer_id,
    payeeId: instruction.payee_id,
    payerAddress: null,
    payeeAddress: null,
    evaluatorAddress: null,
    amountAtomic: null,
    chainId: null,
    contractAddress: null,
    externalJobId: null,
    externalStatus: "simulated_confirmed",
    explorerUrl: null,
    transactionHashes: [transactionHash(instruction.instruction_hash)],
  };

  if (scenario === "mismatch") {
    return {
      ...confirmed,
      amountMinor: (BigInt(instruction.amount_minor) + BigInt(1)).toString(),
    };
  }

  return confirmed;
}
