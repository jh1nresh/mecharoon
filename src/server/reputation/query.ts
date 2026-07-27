import type { Pool, PoolClient } from "pg";

import { deriveCodingReputationView, type CodingReputationView } from "./coding-v0";

type Queryable = Pick<Pool | PoolClient, "query">;

export async function loadCodingReputationView(
  db: Queryable,
  input: {
    subjectId: string;
    evaluatorPolicyHash: string;
  },
): Promise<CodingReputationView> {
  const result = await db.query<{
    final_receipt_id: string;
    revision_count: number;
  }>(
    `
      SELECT final_receipt_id, revision_count
      FROM mecharoon.reputation_events
      WHERE subject_id = $1
        AND domain = 'coding'
        AND evaluator_policy_hash = $2
        AND outcome = 'pass'
      ORDER BY created_at, id
    `,
    [input.subjectId, input.evaluatorPolicyHash],
  );

  return deriveCodingReputationView({
    subjectId: input.subjectId,
    evaluatorPolicyHash: input.evaluatorPolicyHash,
    receiptIds: result.rows.map((row) => row.final_receipt_id),
    totalRevisionCount: result.rows.reduce(
      (total, row) => total + row.revision_count,
      0,
    ),
  });
}
