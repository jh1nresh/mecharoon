import { createPool } from "../src/server/db/pool";

async function main(): Promise<void> {
  const pool = createPool({ max: 1 });
  try {
    const databaseResult = await pool.query<{
      name: string;
      address: string | null;
    }>(
      `
        SELECT
          current_database() AS name,
          host(inet_server_addr()) AS address
      `,
    );
    const database = databaseResult.rows[0]?.name;
    const address = databaseResult.rows[0]?.address;
    if (
      database !== "mecharoon_test" ||
      (address !== null && address !== "127.0.0.1" && address !== "::1")
    ) {
      throw new Error(
        `Refusing to reset database ${database ?? "<unknown>"} at ${address ?? "local socket"}; expected local mecharoon_test.`,
      );
    }

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
    process.stdout.write("Reset Mecharoon-owned tables in mecharoon_test.\n");
  } finally {
    await pool.end();
  }
}

void main();
