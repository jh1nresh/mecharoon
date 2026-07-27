import { createPool } from "../src/server/db/pool";
import { seedDemo } from "../src/server/setup";

async function main(): Promise<void> {
  const pool = createPool({ max: 2 });
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
      database !== "mecharoon_dev" ||
      (address !== null && address !== "127.0.0.1" && address !== "::1")
    ) {
      throw new Error(
        `Refusing to seed database ${database ?? "<unknown>"} at ${address ?? "local socket"}; expected local mecharoon_dev.`,
      );
    }

    const seed = await seedDemo(pool);
    process.stdout.write(`${JSON.stringify(seed, null, 2)}\n`);
  } finally {
    await pool.end();
  }
}

void main();
