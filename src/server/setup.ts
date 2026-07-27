import type { Pool } from "pg";

import { appendDomainEvent } from "./db/events";
import { withTransaction } from "./db/transaction";
import { addHours, systemRuntime, type Runtime } from "./domain/runtime";

export const DEMO_IDS = {
  buyerId: "participant_demo_buyer",
  sellerId: "participant_demo_seller",
  rootAuthorityId: "authority_demo_root",
  childAuthorityId: "authority_demo_child",
} as const;

export type DemoSeed = {
  buyerId: string;
  sellerId: string;
  rootAuthorityId: string;
  childAuthorityId: string;
  rootLimitMinor: string;
  childLimitMinor: string;
};

function idsForNamespace(namespace?: string) {
  if (!namespace) {
    return DEMO_IDS;
  }
  if (!/^[a-z0-9_]{1,48}$/.test(namespace)) {
    throw new Error(
      "Demo namespace must contain 1-48 lowercase letters, numbers, or underscores.",
    );
  }
  return {
    buyerId: `participant_${namespace}_buyer`,
    sellerId: `participant_${namespace}_seller`,
    rootAuthorityId: `authority_${namespace}_root`,
    childAuthorityId: `authority_${namespace}_child`,
  };
}

export async function seedDemo(
  pool: Pool,
  options: {
    runtime?: Runtime;
    rootLimitMinor?: bigint;
    childLimitMinor?: bigint;
    namespace?: string;
  } = {},
): Promise<DemoSeed> {
  const runtime = options.runtime ?? systemRuntime;
  const rootLimit = options.rootLimitMinor ?? BigInt(2000);
  const childLimit = options.childLimitMinor ?? BigInt(1500);
  const ids = idsForNamespace(options.namespace);

  if (childLimit > rootLimit) {
    throw new Error("The child authority must attenuate the root limit.");
  }

  await withTransaction(pool, async (client) => {
    const now = runtime.now();
    const expiresAt = addHours(now, 24 * 365);

    await client.query(
      `
        INSERT INTO mecharoon.participants (id, kind, display_name, created_at)
        VALUES
          ($1, 'buyer', 'Demo Buyer', $3),
          ($2, 'seller', 'Demo Seller', $3)
        ON CONFLICT (id) DO NOTHING
      `,
      [ids.buyerId, ids.sellerId, now],
    );

    const root = await client.query(
      `
        INSERT INTO mecharoon.authority_grants (
          id,
          parent_id,
          principal_id,
          delegate_id,
          currency,
          domain,
          limit_minor,
          reserved_minor,
          settled_minor,
          status,
          expires_at,
          created_at
        )
        VALUES (
          $1, NULL, $2, $2, 'USD', 'coding', $3, 0, 0,
          'active', $4, $5
        )
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `,
      [
        ids.rootAuthorityId,
        ids.buyerId,
        rootLimit.toString(),
        expiresAt,
        now,
      ],
    );

    const child = await client.query(
      `
        INSERT INTO mecharoon.authority_grants (
          id,
          parent_id,
          principal_id,
          delegate_id,
          currency,
          domain,
          limit_minor,
          reserved_minor,
          settled_minor,
          status,
          expires_at,
          created_at
        )
        VALUES (
          $1, $2, $3, $4, 'USD', 'coding', $5, 0, 0,
          'active', $6, $7
        )
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `,
      [
        ids.childAuthorityId,
        ids.rootAuthorityId,
        ids.buyerId,
        ids.sellerId,
        childLimit.toString(),
        expiresAt,
        now,
      ],
    );

    if (root.rowCount === 1) {
      await appendDomainEvent(client, runtime, {
        aggregateType: "authority_grant",
        aggregateId: ids.rootAuthorityId,
        eventType: "root_authority_created",
        payload: {
          principal_id: ids.buyerId,
          limit_minor: rootLimit.toString(),
          currency: "USD",
          domain: "coding",
        },
      });
    }

    if (child.rowCount === 1) {
      await appendDomainEvent(client, runtime, {
        aggregateType: "authority_grant",
        aggregateId: ids.childAuthorityId,
        eventType: "authority_delegated",
        payload: {
          parent_id: ids.rootAuthorityId,
          delegate_id: ids.sellerId,
          limit_minor: childLimit.toString(),
          currency: "USD",
          domain: "coding",
        },
      });
    }
  });

  return {
    ...ids,
    rootLimitMinor: rootLimit.toString(),
    childLimitMinor: childLimit.toString(),
  };
}
