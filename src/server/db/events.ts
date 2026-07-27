import type { PoolClient } from "pg";

import type { Runtime } from "../domain/runtime";

export async function appendDomainEvent(
  client: PoolClient,
  runtime: Runtime,
  input: {
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: Record<string, unknown>;
  },
): Promise<string> {
  const id = runtime.id("evt");
  await client.query(
    `
      INSERT INTO mecharoon.domain_events (
        id,
        aggregate_type,
        aggregate_id,
        event_type,
        payload,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6)
    `,
    [
      id,
      input.aggregateType,
      input.aggregateId,
      input.eventType,
      JSON.stringify(input.payload),
      runtime.now(),
    ],
  );
  return id;
}
