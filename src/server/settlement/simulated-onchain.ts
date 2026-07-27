import { sha256 } from "../domain/hash";

export type SimulatedInstruction = {
  id: string;
  instruction_hash: string;
  amount_minor: string;
  asset: "USDC";
  payer_id: string;
  payee_id: string;
};

export type SettlementObservation = {
  adapterEventId: string;
  state: "unknown" | "confirmed";
  txHash: string | null;
  amountMinor: string | null;
  asset: string | null;
  payerId: string | null;
  payeeId: string | null;
};

function eventId(instructionId: string, phase: "execute" | "reconcile"): string {
  return `sim_evt_${sha256({ instruction_id: instructionId, phase }).slice(0, 32)}`;
}

function transactionHash(instructionHash: string): string {
  return `0x${sha256({
    simulated_transaction_for: instructionHash,
  })}`;
}

export function simulateSettlementExecution(
  instruction: SimulatedInstruction,
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
  };
}

export function simulateSettlementReconciliation(
  instruction: SimulatedInstruction,
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
  };

  if (scenario === "mismatch") {
    return {
      ...confirmed,
      amountMinor: (BigInt(instruction.amount_minor) + BigInt(1)).toString(),
    };
  }

  return confirmed;
}
