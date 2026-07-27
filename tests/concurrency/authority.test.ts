import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import { createAgentService } from "../../src/server/agent";
import { createPool } from "../../src/server/db/pool";
import { createDeterministicRuntime } from "../../src/server/domain/runtime";
import { seedDemo } from "../../src/server/setup";
import { resetOwnedTables } from "../integration/test-db";

const pool = createPool({ max: 50 });

after(async () => {
  await pool.end();
});

beforeEach(async () => {
  await resetOwnedTables(pool);
});

test("50 concurrent unique attempts cannot overspend any authority ancestor", async () => {
  const runtime = createDeterministicRuntime(
    new Date("2026-07-28T00:00:00.000Z"),
  );
  const seed = await seedDemo(pool, { runtime });
  const agent = createAgentService(pool, { runtime });

  const results = await Promise.all(
    Array.from({ length: 50 }, (_, index) =>
      agent.createWorkOrder({
        buyer_id: seed.buyerId,
        seller_id: seed.sellerId,
        authority_grant_id: seed.childAuthorityId,
        amount_minor: "100",
        task_ref: `demo://concurrency/${index}`,
        required_checks: ["unit"],
        idempotency_key: `concurrent-${index}`,
      }),
    ),
  );

  const authorized = results.filter((result) => result.status === "authorized");
  const denied = results.filter((result) => result.status === "denied");
  assert.equal(authorized.length, 15);
  assert.equal(denied.length, 35);
  assert.ok(
    denied.every(
      (result) => result.reason_code === "ANCESTOR_BUDGET_EXCEEDED",
    ),
  );

  const balances = await pool.query<{
    id: string;
    limit_minor: string;
    reserved_minor: string;
    settled_minor: string;
    ledger_reserved: string;
  }>(`
    SELECT
      authority.id,
      authority.limit_minor::text,
      authority.reserved_minor::text,
      authority.settled_minor::text,
      COALESCE(SUM(ledger.delta_reserved_minor), 0)::text AS ledger_reserved
    FROM mecharoon.authority_grants authority
    LEFT JOIN mecharoon.ledger_entries ledger
      ON ledger.authority_grant_id = authority.id
    GROUP BY authority.id
    ORDER BY authority.id
  `);

  for (const balance of balances.rows) {
    assert.ok(
      BigInt(balance.reserved_minor) + BigInt(balance.settled_minor) <=
        BigInt(balance.limit_minor),
    );
    assert.equal(balance.ledger_reserved, balance.reserved_minor);
  }
  assert.equal(
    balances.rows.find((row) => row.id === seed.childAuthorityId)
      ?.reserved_minor,
    "1500",
  );
});

test("50 concurrent identical idempotency keys create one reservation effect", async () => {
  const runtime = createDeterministicRuntime(
    new Date("2026-07-29T00:00:00.000Z"),
  );
  const seed = await seedDemo(pool, { runtime });
  const agent = createAgentService(pool, { runtime });
  const input = {
    buyer_id: seed.buyerId,
    seller_id: seed.sellerId,
    authority_grant_id: seed.childAuthorityId,
    amount_minor: "100",
    task_ref: "demo://concurrency/idempotent",
    required_checks: ["unit"],
    idempotency_key: "same-key",
  };

  const results = await Promise.all(
    Array.from({ length: 50 }, () => agent.createWorkOrder(input)),
  );
  const resourceIds = new Set(
    results.map((result) => result.resource?.id).filter(Boolean),
  );
  assert.equal(resourceIds.size, 1);

  const counts = await pool.query<{
    work_orders: string;
    reservations: string;
    root_reserved: string;
    child_reserved: string;
  }>(`
    SELECT
      (SELECT COUNT(*)::text FROM mecharoon.work_orders) AS work_orders,
      (SELECT COUNT(*)::text FROM mecharoon.reservations) AS reservations,
      (
        SELECT reserved_minor::text
        FROM mecharoon.authority_grants
        WHERE id = 'authority_demo_root'
      ) AS root_reserved,
      (
        SELECT reserved_minor::text
        FROM mecharoon.authority_grants
        WHERE id = 'authority_demo_child'
      ) AS child_reserved
  `);
  assert.deepEqual(counts.rows[0], {
    work_orders: "1",
    reservations: "1",
    root_reserved: "100",
    child_reserved: "100",
  });
});
