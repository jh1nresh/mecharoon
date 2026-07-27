import type { PoolClient } from "pg";

import { DomainError } from "../domain/errors";

export type AuthorityGrantRow = {
  id: string;
  parent_id: string | null;
  principal_id: string;
  delegate_id: string;
  currency: "USD";
  domain: "coding";
  limit_minor: string;
  reserved_minor: string;
  settled_minor: string;
  status: "active" | "revoked";
  expires_at: Date;
};

export async function lockAuthorityPathRootToLeaf(
  client: PoolClient,
  leafGrantId: string,
): Promise<AuthorityGrantRow[]> {
  const pathResult = await client.query<{ id: string; distance: number }>(
    `
      WITH RECURSIVE authority_path AS (
        SELECT id, parent_id, 0 AS distance, ARRAY[id] AS visited
        FROM mecharoon.authority_grants
        WHERE id = $1

        UNION ALL

        SELECT parent.id,
               parent.parent_id,
               child.distance + 1,
               child.visited || parent.id
        FROM mecharoon.authority_grants parent
        JOIN authority_path child ON child.parent_id = parent.id
        WHERE NOT parent.id = ANY(child.visited)
      )
      SELECT id, distance
      FROM authority_path
      ORDER BY distance DESC
    `,
    [leafGrantId],
  );

  if (pathResult.rowCount === 0) {
    throw new DomainError(
      404,
      "AUTHORITY_NOT_FOUND",
      "The authority grant does not exist.",
    );
  }

  const locked: AuthorityGrantRow[] = [];
  for (const pathEntry of pathResult.rows) {
    const grantResult = await client.query<AuthorityGrantRow>(
      `
        SELECT
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
          expires_at
        FROM mecharoon.authority_grants
        WHERE id = $1
        FOR UPDATE
      `,
      [pathEntry.id],
    );

    const grant = grantResult.rows[0];
    if (!grant) {
      throw new DomainError(
        409,
        "AUTHORITY_PATH_CHANGED",
        "The authority path changed during reservation.",
      );
    }
    locked.push(grant);
  }

  if (locked[0]?.parent_id !== null) {
    throw new DomainError(
      409,
      "INVALID_AUTHORITY_PATH",
      "The authority path does not terminate at a root grant.",
    );
  }

  return locked;
}
