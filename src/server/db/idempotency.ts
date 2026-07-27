import type { PoolClient } from "pg";

import { DomainError } from "../domain/errors";
import type { ServiceResult } from "../domain/result";

type ClaimResult<T> =
  | { claimed: true }
  | { claimed: false; response: ServiceResult<T> };

export async function claimIdempotency<T>(
  client: PoolClient,
  input: {
    scope: string;
    key: string;
    requestHash: string;
    now: Date;
  },
): Promise<ClaimResult<T>> {
  const inserted = await client.query(
    `
      INSERT INTO mecharoon.idempotency_records (
        scope, key, request_hash, created_at
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (scope, key) DO NOTHING
      RETURNING scope
    `,
    [input.scope, input.key, input.requestHash, input.now],
  );

  if (inserted.rowCount === 1) {
    return { claimed: true };
  }

  const existing = await client.query<{
    request_hash: string;
    response_body: ServiceResult<T> | null;
  }>(
    `
      SELECT request_hash, response_body
      FROM mecharoon.idempotency_records
      WHERE scope = $1 AND key = $2
      FOR UPDATE
    `,
    [input.scope, input.key],
  );

  const record = existing.rows[0];
  if (!record) {
    throw new DomainError(
      409,
      "IDEMPOTENCY_IN_PROGRESS",
      "The idempotency record is being resolved.",
    );
  }

  if (record.request_hash !== input.requestHash) {
    throw new DomainError(
      409,
      "IDEMPOTENCY_CONFLICT",
      "The idempotency key was already used with a different request.",
    );
  }

  if (!record.response_body) {
    throw new DomainError(
      409,
      "IDEMPOTENCY_IN_PROGRESS",
      "The idempotent operation has not completed.",
    );
  }

  return { claimed: false, response: record.response_body };
}

export async function completeIdempotency<T>(
  client: PoolClient,
  input: {
    scope: string;
    key: string;
    responseStatus: number;
    response: ServiceResult<T>;
    resourceId?: string;
    now: Date;
  },
): Promise<void> {
  await client.query(
    `
      UPDATE mecharoon.idempotency_records
      SET response_status = $3,
          response_body = $4::jsonb,
          resource_id = $5,
          completed_at = $6
      WHERE scope = $1 AND key = $2
    `,
    [
      input.scope,
      input.key,
      input.responseStatus,
      JSON.stringify(input.response),
      input.resourceId ?? null,
      input.now,
    ],
  );
}
