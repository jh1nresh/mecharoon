export type SettlementAdapterName =
  | "simulated_onchain_v0"
  | "arc_testnet_erc8183_v0";

export type SettlementInstruction = {
  id: string;
  adapter: SettlementAdapterName;
  chain: "simulated" | "arc_testnet";
  instruction_hash: string;
  verdict_hash: string;
  deliverable_hash: string;
  amount_minor: string;
  asset: "USDC";
  payer_id: string;
  payee_id: string;
  payer_address: string | null;
  payee_address: string | null;
  evaluator_address: string | null;
  contract_address: string | null;
  expires_at: Date;
};

export type SettlementObservation = {
  adapterEventId: string;
  state: "unknown" | "confirmed" | "failed";
  txHash: string | null;
  amountMinor: string | null;
  amountAtomic: string | null;
  asset: string | null;
  payerId: string | null;
  payeeId: string | null;
  payerAddress: string | null;
  payeeAddress: string | null;
  evaluatorAddress: string | null;
  chainId: number | null;
  contractAddress: string | null;
  externalJobId: string | null;
  externalStatus: string | null;
  explorerUrl: string | null;
  transactionHashes: string[];
};

export interface SettlementAdapter {
  readonly name: SettlementAdapterName;
  execute(instruction: SettlementInstruction): Promise<SettlementObservation>;
  reconcile(instruction: SettlementInstruction): Promise<SettlementObservation>;
}
