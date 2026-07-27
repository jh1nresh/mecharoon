import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createPool } from "../src/server/db/pool";

async function main(): Promise<void> {
  const pool = createPool({ max: 1 });
  try {
    if (process.env.MECHAROON_MIGRATION_MODE === "test") {
      const target = await pool.query<{
        name: string;
        address: string | null;
      }>(
        `
          SELECT
            current_database() AS name,
            host(inet_server_addr()) AS address
        `,
      );
      const { name, address } = target.rows[0] ?? {};
      if (
        name !== "mecharoon_test" ||
        (address !== null &&
          address !== "127.0.0.1" &&
          address !== "::1")
      ) {
        throw new Error(
          `Refusing test migration for database ${name ?? "<unknown>"} at ${address ?? "local socket"}.`,
        );
      }
    }

    const migrationDirectory = resolve(process.cwd(), "db/migrations");
    const migrationFiles = (await readdir(migrationDirectory))
      .filter((file) => /^\d+_.+\.sql$/.test(file))
      .sort();

    for (const file of migrationFiles) {
      const migration = await readFile(resolve(migrationDirectory, file), "utf8");
      await pool.query(migration);
      process.stdout.write(`Applied db/migrations/${file}\n`);
    }
  } finally {
    await pool.end();
  }
}

void main();
