import { Pool, type PoolConfig } from "pg";

let sharedPool: Pool | undefined;

function configuredPoolSize(): number {
  const parsed = Number.parseInt(
    process.env.MECHAROON_DB_POOL_MAX ?? "",
    10,
  );
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 50 ? parsed : 5;
}

function configuredSsl(
  connectionString: string | undefined,
): PoolConfig["ssl"] | undefined {
  const ca = process.env.MECHAROON_DATABASE_CA_CERT?.trim();
  if (!ca) {
    return undefined;
  }

  if (
    connectionString &&
    /[?&](?:ssl|sslmode|sslcert|sslkey|sslrootcert|uselibpqcompat)=/i.test(
      connectionString,
    )
  ) {
    throw new Error(
      "MECHAROON_DATABASE_URL must not contain SSL query parameters when MECHAROON_DATABASE_CA_CERT is set.",
    );
  }

  return {
    ca: ca.replaceAll("\\n", "\n"),
    rejectUnauthorized: true,
  };
}

export function createPool(config: PoolConfig = {}): Pool {
  const connectionString =
    process.env.MECHAROON_DATABASE_URL ?? process.env.DATABASE_URL;
  const ssl = configuredSsl(connectionString);

  return new Pool({
    ...(connectionString ? { connectionString } : {}),
    max: configuredPoolSize(),
    ...(ssl ? { ssl } : {}),
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
