import assert from "node:assert/strict";
import test from "node:test";

import type { PoolConfig } from "pg";

import { createPool } from "../../src/server/db/pool";

const ORIGINAL_DATABASE_URL = process.env.MECHAROON_DATABASE_URL;
const ORIGINAL_DATABASE_CA_CERT =
  process.env.MECHAROON_DATABASE_CA_CERT;

test.afterEach(() => {
  if (ORIGINAL_DATABASE_URL === undefined) {
    delete process.env.MECHAROON_DATABASE_URL;
  } else {
    process.env.MECHAROON_DATABASE_URL = ORIGINAL_DATABASE_URL;
  }

  if (ORIGINAL_DATABASE_CA_CERT === undefined) {
    delete process.env.MECHAROON_DATABASE_CA_CERT;
  } else {
    process.env.MECHAROON_DATABASE_CA_CERT =
      ORIGINAL_DATABASE_CA_CERT;
  }
});

test("managed PostgreSQL uses the configured CA and verifies the server", async () => {
  process.env.MECHAROON_DATABASE_URL =
    "postgresql://runtime:secret@database.example:6543/postgres";
  process.env.MECHAROON_DATABASE_CA_CERT =
    "-----BEGIN CERTIFICATE-----\\nprovider-ca\\n-----END CERTIFICATE-----";

  const pool = createPool();
  const options = (
    pool as unknown as {
      options: PoolConfig;
    }
  ).options;

  assert.deepEqual(options.ssl, {
    ca: "-----BEGIN CERTIFICATE-----\nprovider-ca\n-----END CERTIFICATE-----",
    rejectUnauthorized: true,
  });
  await pool.end();
});

test("CA verification rejects conflicting connection-string SSL settings", () => {
  process.env.MECHAROON_DATABASE_URL =
    "postgresql://runtime:secret@database.example:6543/postgres?sslmode=require";
  process.env.MECHAROON_DATABASE_CA_CERT =
    "-----BEGIN CERTIFICATE-----\\nprovider-ca\\n-----END CERTIFICATE-----";

  assert.throws(
    () => createPool(),
    /must not contain SSL query parameters/,
  );
});
