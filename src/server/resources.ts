import type { CodingReputationView } from "./reputation/coding-v0";

export type WorkOrderResource = {
  id: string;
  state: string;
  buyer_id: string;
  seller_id: string;
  authority_grant_id: string;
  reservation_id: string;
  amount_minor: string;
  currency: "USD";
  domain: "coding";
  task_ref: string;
  route_code: string;
  reputation_snapshot: CodingReputationView;
  settlement_instruction_id: string | null;
};

export type SubmissionResource = {
  work_order_id: string;
  submission_id: string;
  submission_sequence: number;
  verdict: "revise" | "pass";
  reason_codes: string[];
  settlement_instruction_id: string | null;
};

export type SettlementResource = {
  instruction_id: string;
  work_order_id: string;
  reservation_id: string;
  settlement_state: string;
  reservation_state: string;
  tx_hash: string | null;
  final_receipt_id: string | null;
};

export type AuthorityExposureResource = {
  authority_grant_id: string;
  limit_minor: string;
  reserved_minor: string;
  settled_minor: string;
  available_minor: string;
};

export type FinalReceiptResource = {
  receipt_id: string;
  work_order_id: string;
  version: number;
  receipt_hash: string;
  receipt: Record<string, unknown>;
};
