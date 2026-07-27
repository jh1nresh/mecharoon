import { Pool, type PoolConfig } from "pg";

let sharedPool: Pool | undefined;

function configuredPoolSize(): number {
  const parsed = Number.parseInt(
    process.env.MECHAROON_DB_POOL_MAX ?? "",
    10,
  );
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 50 ? parsed : 5;
}

export function createPool(config: PoolConfig = {}): Pool {
  const connectionString =
    process.env.MECHAROON_DATABASE_URL ?? process.env.DATABASE_URL;

  return new Pool({
    ...(connectionString ? { connectionString } : {}),
    max: configuredPoolSize(),
    ...config,
  });
}

export function getPool(): Pool {
  if (!sharedPool) {
    sharedPool = createPool();
  }
  return sharedPool;
}

export async function closeSharedPool(): Promise<void> {
  if (sharedPool) {
    await sharedPool.end();
    sharedPool = undefined;
  }
}
