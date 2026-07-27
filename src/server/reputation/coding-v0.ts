export type CodingReputationView = {
  subject_id: string;
  domain: "coding";
  evaluator_policy_hash: string;
  sample_size: number;
  final_pass_count: number;
  total_revision_count: number;
  max_job_amount_minor: string;
  route_code: "new_seller" | "proven_once";
  derived_from_receipt_ids: string[];
};

export function deriveCodingReputationView(input: {
  subjectId: string;
  evaluatorPolicyHash: string;
  receiptIds: string[];
  totalRevisionCount: number;
}): CodingReputationView {
  const receiptIds = [...new Set(input.receiptIds)].sort();
  const proven = receiptIds.length >= 1;

  return {
    subject_id: input.subjectId,
    domain: "coding",
    evaluator_policy_hash: input.evaluatorPolicyHash,
    sample_size: receiptIds.length,
    final_pass_count: receiptIds.length,
    total_revision_count: input.totalRevisionCount,
    max_job_amount_minor: proven ? "1000" : "500",
    route_code: proven ? "proven_once" : "new_seller",
    derived_from_receipt_ids: receiptIds,
  };
}
