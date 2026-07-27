import type { Pool } from "pg";

import { DomainError } from "./domain/errors";
import { minorToJson } from "./domain/money";
import { loadCodingReputationView } from "./reputation/query";
import type {
  AuthorityExposureResource,
  FinalReceiptResource,
  WorkOrderResource,
} from "./resources";

export function createQueryService(pool: Pool) {
  return {
    async getWorkOrder(workOrderId: string): Promise<WorkOrderResource> {
      const result = await pool.query<{
        id: string;
        state: string;
        buyer_id: string;
        seller_id: string;
        authority_grant_id: string;
        reservation_id: string;
        amount_minor: string;
        task_ref: string;
        route_code: string;
        reputation_snapshot: WorkOrderResource["reputation_snapshot"];
        instruction_id: string | null;
      }>(
        `
          SELECT
            work.id,
            work.state,
            work.buyer_id,
            work.seller_id,
            work.authority_grant_id,
            reservation.id AS reservation_id,
            work.amount_minor,
            work.task_ref,
            work.route_code,
            work.reputation_snapshot,
            instruction.id AS instruction_id
          FROM mecharoon.work_orders work
          JOIN mecharoon.reservations reservation
            ON reservation.work_order_id = work.id
          LEFT JOIN mecharoon.settlement_instructions instruction
            ON instruction.work_order_id = work.id
          WHERE work.id = $1
        `,
        [workOrderId],
      );

      const row = result.rows[0];
      if (!row) {
        throw new DomainError(
          404,
          "WORK_ORDER_NOT_FOUND",
          "The work order does not exist.",
        );
      }

      return {
        id: row.id,
        state: row.state,
        buyer_id: row.buyer_id,
        seller_id: row.seller_id,
        authority_grant_id: row.authority_grant_id,
        reservation_id: row.reservation_id,
        amount_minor: minorToJson(row.amount_minor),
        currency: "USD",
        domain: "coding",
        task_ref: row.task_ref,
        route_code: row.route_code,
        reputation_snapshot: row.reputation_snapshot,
        settlement_instruction_id: row.instruction_id,
      };
    },

    async getFinalReceipt(
      workOrderId: string,
    ): Promise<FinalReceiptResource | null> {
      const result = await pool.query<{
        id: string;
        work_order_id: string;
        version: number;
        receipt_hash: string;
        receipt: Record<string, unknown>;
      }>(
        `
          SELECT id, work_order_id, version, receipt_hash, receipt
          FROM mecharoon.final_receipts
          WHERE work_order_id = $1
          ORDER BY version DESC
          LIMIT 1
        `,
        [workOrderId],
      );

      const row = result.rows[0];
      return row
        ? {
            receipt_id: row.id,
            work_order_id: row.work_order_id,
            version: row.version,
            receipt_hash: row.receipt_hash,
            receipt: row.receipt,
          }
        : null;
    },

    async getReputationView(input: {
      subjectId: string;
      evaluatorPolicyHash: string;
    }) {
      return loadCodingReputationView(pool, input);
    },

    async getAuthorityExposure(
      authorityGrantId: string,
    ): Promise<AuthorityExposureResource> {
      const result = await pool.query<{
        id: string;
        limit_minor: string;
        reserved_minor: string;
        settled_minor: string;
      }>(
        `
          SELECT id, limit_minor, reserved_minor, settled_minor
          FROM mecharoon.authority_grants
          WHERE id = $1
        `,
        [authorityGrantId],
      );

      const row = result.rows[0];
      if (!row) {
        throw new DomainError(
          404,
          "AUTHORITY_NOT_FOUND",
          "The authority grant does not exist.",
        );
      }

      const limit = BigInt(row.limit_minor);
      const reserved = BigInt(row.reserved_minor);
      const settled = BigInt(row.settled_minor);

      return {
        authority_grant_id: row.id,
        limit_minor: limit.toString(),
        reserved_minor: reserved.toString(),
        settled_minor: settled.toString(),
        available_minor: (limit - reserved - settled).toString(),
      };
    },
  };
}
