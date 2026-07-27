import type { Pool } from "pg";

export async function assertTestDatabase(pool: Pool): Promise<void> {
  const result = await pool.query<{
    name: string;
    address: string | null;
  }>(
    `
      SELECT
        current_database() AS name,
        host(inet_server_addr()) AS address
    `,
  );
  const database = result.rows[0]?.name;
  const address = result.rows[0]?.address;
  if (
    database !== "mecharoon_test" ||
    (address !== null && address !== "127.0.0.1" && address !== "::1")
  ) {
    throw new Error(
      `Tests may reset only local mecharoon_test; connected to ${database ?? "<unknown>"} at ${address ?? "local socket"}.`,
    );
  }
}

export async function resetOwnedTables(pool: Pool): Promise<void> {
  await assertTestDatabase(pool);
  await pool.query(`
    TRUNCATE TABLE
      mecharoon.idempotency_records,
      mecharoon.reputation_events,
      mecharoon.final_receipts,
      mecharoon.onchain_settlement_records,
      mecharoon.settlement_instructions,
      mecharoon.ledger_entries,
      mecharoon.verdicts,
      mecharoon.submissions,
      mecharoon.reservations,
      mecharoon.work_orders,
      mecharoon.domain_events,
      mecharoon.authority_grants,
      mecharoon.participants
    RESTART IDENTITY CASCADE
  `);
}
