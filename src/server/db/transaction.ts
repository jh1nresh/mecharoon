import type { Pool, PoolClient } from "pg";

const RETRYABLE_CODES = new Set(["40001", "40P01"]);

type PostgresError = Error & {
  code?: string;
};

export function isRetryableTransactionError(error: unknown): boolean {
  return (
    error instanceof Error &&
    RETRYABLE_CODES.has((error as PostgresError).code ?? "")
  );
}

export async function withTransaction<T>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<T>,
  maxAttempts = 5,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
      const result = await operation(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      lastError = error;
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original transaction error.
      }

      if (!isRetryableTransactionError(error) || attempt === maxAttempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 5));
    } finally {
      client.release();
    }
  }

  throw lastError;
}
