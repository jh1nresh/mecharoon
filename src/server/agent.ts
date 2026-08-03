import type { Pool, PoolClient } from "pg";

import { lockAuthorityPathRootToLeaf } from "./db/authority";
import { appendDomainEvent } from "./db/events";
import {
  claimIdempotency,
  completeIdempotency,
} from "./db/idempotency";
import { withTransaction } from "./db/transaction";
import { DomainError } from "./domain/errors";
import { sha256 } from "./domain/hash";
import { parseMinorAmount } from "./domain/money";
import type { ServiceResult } from "./domain/result";
import { addHours, systemRuntime, type Runtime } from "./domain/runtime";
import {
  createWorkOrderSchema,
  submitWorkSchema,
  type CreateWorkOrderInput,
  type SubmitWorkInput,
} from "./domain/schemas";
import {
  CODING_POLICY,
  codingPolicyHash,
  evaluateCodingSubmission,
} from "./evaluation/coding-v0";
import { loadCodingReputationView } from "./reputation/query";
import type { SubmissionResource, WorkOrderResource } from "./resources";
import {
  settlementProfileFromEnvironment,
  type SettlementProfile,
} from "./settlement/profile";

type AgentServiceOptions = {
  runtime?: Runtime;
  settlementProfile?: SettlementProfile;
};

function workOrderResource(input: {
  workOrderId: string;
  reservationId: string;
  buyerId: string;
  sellerId: string;
  grantId: string;
  amountMinor: bigint;
  taskRef: string;
  routeCode: string;
  reputationSnapshot: WorkOrderResource["reputation_snapshot"];
  instructionId?: string;
}): WorkOrderResource {
  return {
    id: input.workOrderId,
    state: "authorized",
    buyer_id: input.buyerId,
    seller_id: input.sellerId,
    authority_grant_id: input.grantId,
    reservation_id: input.reservationId,
    amount_minor: input.amountMinor.toString(),
    currency: "USD",
    domain: "coding",
    task_ref: input.taskRef,
    route_code: input.routeCode,
    reputation_snapshot: input.reputationSnapshot,
    settlement_instruction_id: input.instructionId ?? null,
  };
}

async function insertReserveLedgerEntries(
  client: PoolClient,
  runtime: Runtime,
  input: {
    authorityIds: string[];
    reservationId: string;
    amountMinor: bigint;
  },
): Promise<void> {
  const eventId = runtime.id("ledger_event");
  const createdAt = runtime.now();

  for (const authorityId of input.authorityIds) {
    await client.query(
      `
        INSERT INTO mecharoon.ledger_entries (
          id,
          event_id,
          authority_grant_id,
          reservation_id,
          event_type,
          delta_reserved_minor,
          delta_settled_minor,
          created_at
        )
        VALUES ($1, $2, $3, $4, 'reserve', $5, 0, $6)
      `,
      [
        runtime.id("ledger"),
        eventId,
        authorityId,
        input.reservationId,
        input.amountMinor.toString(),
        createdAt,
      ],
    );
  }
}

export function createAgentService(pool: Pool, options: AgentServiceOptions = {}) {
  const runtime = options.runtime ?? systemRuntime;
  const settlementProfile =
    options.settlementProfile ?? settlementProfileFromEnvironment();

  return {
    async createWorkOrder(
      unsafeInput: CreateWorkOrderInput,
    ): Promise<ServiceResult<WorkOrderResource>> {
      const parsed = createWorkOrderSchema.parse(unsafeInput);
      const amountMinor = parseMinorAmount(parsed.amount_minor);
      const requiredChecks = [...new Set(parsed.required_checks)].sort();
      const evaluatorPolicyHash = codingPolicyHash(requiredChecks);
      const normalizedRequest = {
        buyer_id: parsed.buyer_id,
        seller_id: parsed.seller_id,
        authority_grant_id: parsed.authority_grant_id,
        amount_minor: amountMinor.toString(),
        task_ref: parsed.task_ref,
        required_checks: requiredChecks,
      };
      const requestHash = sha256(normalizedRequest);
      const scope = `create_work_order:${parsed.buyer_id}`;

      return withTransaction(pool, async (client) => {
        const claimed = await claimIdempotency<WorkOrderResource>(client, {
          scope,
          key: parsed.idempotency_key,
          requestHash,
          now: runtime.now(),
        });
        if (!claimed.claimed) {
          return claimed.response;
        }

        const reputationView = await loadCodingReputationView(client, {
          subjectId: parsed.seller_id,
          evaluatorPolicyHash,
        });

        if (amountMinor > BigInt(reputationView.max_job_amount_minor)) {
          const denied: ServiceResult<WorkOrderResource> = {
            status: "denied",
            reason_code: "REPUTATION_LIMIT_EXCEEDED",
            next_actions: [
              {
                action: "reduce_amount",
              },
              {
                action: "complete_verified_work",
              },
            ],
            resource: null,
          };
          await completeIdempotency(client, {
            scope,
            key: parsed.idempotency_key,
            responseStatus: 422,
            response: denied,
            now: runtime.now(),
          });
          return denied;
        }

        const authorityPath = await lockAuthorityPathRootToLeaf(
          client,
          parsed.authority_grant_id,
        );
        const root = authorityPath[0];
        const leaf = authorityPath.at(-1);
        const now = runtime.now();

        if (!root || !leaf) {
          throw new DomainError(
            409,
            "INVALID_AUTHORITY_PATH",
            "The authority path is empty.",
          );
        }

        if (
          root.principal_id !== parsed.buyer_id ||
          leaf.delegate_id !== parsed.seller_id
        ) {
          throw new DomainError(
            403,
            "AUTHORITY_SCOPE_MISMATCH",
            "The work order actors do not match the authority lineage.",
          );
        }

        for (let index = 1; index < authorityPath.length; index += 1) {
          const parent = authorityPath[index - 1];
          const child = authorityPath[index];
          if (
            !parent ||
            !child ||
            child.parent_id !== parent.id ||
            child.principal_id !== parent.delegate_id
          ) {
            throw new DomainError(
              409,
              "INVALID_DELEGATION_LINEAGE",
              "Each child grant must be delegated by its parent authority holder.",
            );
          }
        }

        for (const grant of authorityPath) {
          if (
            grant.status !== "active" ||
            grant.expires_at.getTime() <= now.getTime()
          ) {
            throw new DomainError(
              422,
              "AUTHORITY_INACTIVE",
              "An authority ancestor is revoked or expired.",
              { authority_grant_id: grant.id },
            );
          }

          const available =
            BigInt(grant.limit_minor) -
            BigInt(grant.reserved_minor) -
            BigInt(grant.settled_minor);
          if (amountMinor > available) {
            const denied: ServiceResult<WorkOrderResource> = {
              status: "denied",
              reason_code: "ANCESTOR_BUDGET_EXCEEDED",
              next_actions: [
                {
                  action: "reduce_amount",
                },
              ],
              resource: null,
            };
            await completeIdempotency(client, {
              scope,
              key: parsed.idempotency_key,
              responseStatus: 422,
              response: denied,
              now: runtime.now(),
            });
            return denied;
          }
        }

        const workOrderId = runtime.id("wo");
        const reservationId = runtime.id("res");
        const createdAt = runtime.now();

        await client.query(
          `
            INSERT INTO mecharoon.work_orders (
              id,
              buyer_id,
              seller_id,
              authority_grant_id,
              amount_minor,
              currency,
              domain,
              task_ref,
              acceptance_policy_id,
              acceptance_policy_version,
              acceptance_policy_hash,
              required_checks,
              reputation_snapshot,
              route_code,
              state,
              created_at,
              updated_at
            )
            VALUES (
              $1, $2, $3, $4, $5, 'USD', 'coding', $6, $7, $8, $9,
              $10::jsonb, $11::jsonb, $12, 'authorized', $13, $13
            )
          `,
          [
            workOrderId,
            parsed.buyer_id,
            parsed.seller_id,
            parsed.authority_grant_id,
            amountMinor.toString(),
            parsed.task_ref,
            CODING_POLICY.id,
            CODING_POLICY.version,
            evaluatorPolicyHash,
            JSON.stringify(requiredChecks),
            JSON.stringify(reputationView),
            reputationView.route_code,
            createdAt,
          ],
        );

        await client.query(
          `
            INSERT INTO mecharoon.reservations (
              id,
              work_order_id,
              authority_grant_id,
              amount_minor,
              state,
              created_at,
              updated_at
            )
            VALUES ($1, $2, $3, $4, 'held', $5, $5)
          `,
          [
            reservationId,
            workOrderId,
            parsed.authority_grant_id,
            amountMinor.toString(),
            createdAt,
          ],
        );

        for (const grant of authorityPath) {
          const updated = await client.query(
            `
              UPDATE mecharoon.authority_grants
              SET reserved_minor = reserved_minor + $2
              WHERE id = $1
                AND reserved_minor + settled_minor + $2 <= limit_minor
            `,
            [grant.id, amountMinor.toString()],
          );
          if (updated.rowCount !== 1) {
            throw new DomainError(
              409,
              "ANCESTOR_BUDGET_RACE",
              "The authority exposure changed during reservation.",
            );
          }
        }

        await insertReserveLedgerEntries(client, runtime, {
          authorityIds: authorityPath.map((grant) => grant.id),
          reservationId,
          amountMinor,
        });

        await appendDomainEvent(client, runtime, {
          aggregateType: "work_order",
          aggregateId: workOrderId,
          eventType: "work_authorized",
          payload: {
            authority_path: authorityPath.map((grant) => grant.id),
            reservation_id: reservationId,
            amount_minor: amountMinor.toString(),
            reputation_snapshot: reputationView,
          },
        });

        const response: ServiceResult<WorkOrderResource> = {
          status: "authorized",
          reason_code: "WORK_RESERVED",
          next_actions: [
            {
              action: "submit_work",
              method: "POST",
              href: `/api/v0/work-orders/${workOrderId}/submissions`,
            },
          ],
          resource: workOrderResource({
            workOrderId,
            reservationId,
            buyerId: parsed.buyer_id,
            sellerId: parsed.seller_id,
            grantId: parsed.authority_grant_id,
            amountMinor,
            taskRef: parsed.task_ref,
            routeCode: reputationView.route_code,
            reputationSnapshot: reputationView,
          }),
        };

        await completeIdempotency(client, {
          scope,
          key: parsed.idempotency_key,
          responseStatus: 201,
          response,
          resourceId: workOrderId,
          now: runtime.now(),
        });

        return response;
      });
    },

    async submitWork(
      unsafeInput: SubmitWorkInput,
    ): Promise<ServiceResult<SubmissionResource>> {
      const parsed = submitWorkSchema.parse(unsafeInput);
      const normalizedChecks = [...parsed.checks].sort((left, right) =>
        left.name.localeCompare(right.name),
      );
      const requestHash = sha256({
        work_order_id: parsed.work_order_id,
        artifact_ref: parsed.artifact_ref,
        artifact_sha256: parsed.artifact_sha256,
        checks: normalizedChecks,
      });
      const scope = `submit_work:${parsed.work_order_id}`;

      return withTransaction(pool, async (client) => {
        const claimed = await claimIdempotency<SubmissionResource>(client, {
          scope,
          key: parsed.idempotency_key,
          requestHash,
          now: runtime.now(),
        });
        if (!claimed.claimed) {
          return claimed.response;
        }

        const workResult = await client.query<{
          id: string;
          state: string;
          buyer_id: string;
          seller_id: string;
          amount_minor: string;
          acceptance_policy_hash: string;
          required_checks: string[];
          reservation_id: string;
        }>(
          `
            SELECT
              work.id,
              work.state,
              work.buyer_id,
              work.seller_id,
              work.amount_minor,
              work.acceptance_policy_hash,
              work.required_checks,
              reservation.id AS reservation_id
            FROM mecharoon.work_orders work
            JOIN mecharoon.reservations reservation
              ON reservation.work_order_id = work.id
            WHERE work.id = $1
            FOR UPDATE OF work, reservation
          `,
          [parsed.work_order_id],
        );
        const work = workResult.rows[0];
        if (!work) {
          throw new DomainError(
            404,
            "WORK_ORDER_NOT_FOUND",
            "The work order does not exist.",
          );
        }

        if (!["authorized", "provisional_revise"].includes(work.state)) {
          throw new DomainError(
            409,
            "INVALID_WORK_TRANSITION",
            "The work order no longer accepts submissions.",
            { state: work.state },
          );
        }

        const sequenceResult = await client.query<{ next_sequence: number }>(
          `
            SELECT COALESCE(MAX(sequence), 0)::integer + 1 AS next_sequence
            FROM mecharoon.submissions
            WHERE work_order_id = $1
          `,
          [parsed.work_order_id],
        );
        const sequence = sequenceResult.rows[0]?.next_sequence ?? 1;
        const submissionId = runtime.id("sub");
        const verdictId = runtime.id("verdict");
        const createdAt = runtime.now();

        await client.query(
          `
            INSERT INTO mecharoon.submissions (
              id,
              work_order_id,
              sequence,
              artifact_ref,
              artifact_sha256,
              normalized_check_results,
              request_hash,
              created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
          `,
          [
            submissionId,
            parsed.work_order_id,
            sequence,
            parsed.artifact_ref,
            parsed.artifact_sha256,
            JSON.stringify(normalizedChecks),
            requestHash,
            createdAt,
          ],
        );

        const verdict = evaluateCodingSubmission(
          work.required_checks,
          normalizedChecks,
        );
        await client.query(
          `
            INSERT INTO mecharoon.verdicts (
              id,
              submission_id,
              evaluator_policy_hash,
              outcome,
              reason_codes,
              created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            verdictId,
            submissionId,
            work.acceptance_policy_hash,
            verdict.outcome,
            verdict.reasonCodes,
            createdAt,
          ],
        );

        await appendDomainEvent(client, runtime, {
          aggregateType: "work_order",
          aggregateId: parsed.work_order_id,
          eventType: "work_evaluated",
          payload: {
            submission_id: submissionId,
            submission_sequence: sequence,
            artifact_ref: parsed.artifact_ref,
            artifact_sha256: parsed.artifact_sha256,
            outcome: verdict.outcome,
            reason_codes: verdict.reasonCodes,
          },
        });

        let instructionId: string | null = null;
        if (verdict.outcome === "revise") {
          await client.query(
            `
              UPDATE mecharoon.work_orders
              SET state = 'provisional_revise', updated_at = $2
              WHERE id = $1
            `,
            [parsed.work_order_id, runtime.now()],
          );
        } else {
          if (
            settlementProfile.adapter === "arc_testnet_erc8183_v0" &&
            (work.buyer_id !== settlementProfile.buyerId ||
              work.seller_id !== settlementProfile.sellerId)
          ) {
            throw new DomainError(
              403,
              "ARC_SETTLEMENT_PARTICIPANT_MISMATCH",
              "The WorkOrder participants do not match the fixed Arc Testnet wallet mapping.",
            );
          }
          instructionId = runtime.id("si");
          const nonce = runtime.id("nonce");
          const expiresAt = addHours(runtime.now(), 1);
          const instructionPayload = {
            instruction_id: instructionId,
            work_order_id: parsed.work_order_id,
            reservation_id: work.reservation_id,
            adapter: settlementProfile.adapter,
            chain: settlementProfile.chain,
            asset: "USDC",
            payer_id: work.buyer_id,
            payee_id: work.seller_id,
            amount_minor: BigInt(work.amount_minor).toString(),
            action: "pay",
            policy_hash: work.acceptance_policy_hash,
            verdict_hash: verdict.verdictHash,
            nonce,
            adapter_audience: settlementProfile.audience,
            expires_at: expiresAt.toISOString(),
          };
          const instructionHash = sha256(instructionPayload);
          const authorizationCommitment = sha256({
            adapter: settlementProfile.adapter,
            instruction_hash: instructionHash,
          });
          const simulatedSignature =
            settlementProfile.adapter === "simulated_onchain_v0"
              ? authorizationCommitment
              : null;
          const arcProfile =
            settlementProfile.adapter === "arc_testnet_erc8183_v0"
              ? settlementProfile
              : null;

          await client.query(
            `
              INSERT INTO mecharoon.settlement_instructions (
                id,
                work_order_id,
                reservation_id,
                adapter,
                chain,
                asset,
                payer_id,
                payee_id,
                amount_minor,
                action,
                policy_hash,
                verdict_hash,
                nonce,
                adapter_audience,
                expires_at,
                instruction_hash,
                simulated_signature,
                authorization_commitment,
                deliverable_hash,
                payer_address,
                payee_address,
                evaluator_address,
                contract_address,
                state,
                created_at,
                updated_at
              )
              VALUES (
                $1, $2, $3, $4, $5, 'USDC',
                $6, $7, $8, 'pay', $9, $10, $11, $12,
                $13, $14, $15, $16, $17, $18, $19, $20, $21,
                'instructed', $22, $22
              )
            `,
            [
              instructionId,
              parsed.work_order_id,
              work.reservation_id,
              settlementProfile.adapter,
              settlementProfile.chain,
              work.buyer_id,
              work.seller_id,
              BigInt(work.amount_minor).toString(),
              work.acceptance_policy_hash,
              verdict.verdictHash,
              nonce,
              settlementProfile.audience,
              expiresAt,
              instructionHash,
              simulatedSignature,
              authorizationCommitment,
              parsed.artifact_sha256,
              arcProfile?.payerAddress ?? null,
              arcProfile?.payeeAddress ?? null,
              arcProfile?.evaluatorAddress ?? null,
              arcProfile?.contractAddress ?? null,
              runtime.now(),
            ],
          );

          await client.query(
            `
              UPDATE mecharoon.work_orders
              SET state = 'final_pass', updated_at = $2
              WHERE id = $1
            `,
            [parsed.work_order_id, runtime.now()],
          );

          await appendDomainEvent(client, runtime, {
            aggregateType: "settlement_instruction",
            aggregateId: instructionId,
            eventType: "settlement_instructed",
            payload: {
              work_order_id: parsed.work_order_id,
              reservation_id: work.reservation_id,
              instruction_hash: instructionHash,
              amount_minor: BigInt(work.amount_minor).toString(),
              asset: "USDC",
              adapter: settlementProfile.adapter,
              chain: settlementProfile.chain,
            },
          });
        }

        const response: ServiceResult<SubmissionResource> = {
          status: verdict.outcome === "revise" ? "revise" : "final_pass",
          reason_code:
            verdict.outcome === "revise"
              ? "REQUIRED_CHECK_FAILED"
              : "WORK_FINAL_PASS",
          next_actions:
            verdict.outcome === "revise"
              ? [
                  {
                    action: "submit_revision",
                    method: "POST",
                    href: `/api/v0/work-orders/${parsed.work_order_id}/submissions`,
                  },
                ]
              : [
                  {
                    action: "execute_settlement",
                  },
                ],
          resource: {
            work_order_id: parsed.work_order_id,
            submission_id: submissionId,
            submission_sequence: sequence,
            verdict: verdict.outcome,
            reason_codes: verdict.reasonCodes,
            settlement_instruction_id: instructionId,
          },
        };

        await completeIdempotency(client, {
          scope,
          key: parsed.idempotency_key,
          responseStatus: 201,
          response,
          resourceId: submissionId,
          now: runtime.now(),
        });
        return response;
      });
    },
  };
}
