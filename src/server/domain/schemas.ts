import { z } from "zod";

export const createWorkOrderSchema = z
  .object({
    buyer_id: z.string().min(1).max(128),
    seller_id: z.string().min(1).max(128),
    authority_grant_id: z.string().min(1).max(128),
    amount_minor: z.union([
      z.bigint(),
      z.string().regex(/^(0|[1-9][0-9]*)$/),
    ]),
    task_ref: z.string().min(1).max(512),
    required_checks: z.array(z.string().min(1).max(128)).min(1).max(32),
    idempotency_key: z.string().min(1).max(255),
  })
  .strict();

export const submitWorkSchema = z
  .object({
    work_order_id: z.string().min(1).max(128),
    artifact_ref: z.string().min(1).max(1024),
    artifact_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    checks: z
      .array(
        z
          .object({
            name: z.string().min(1).max(128),
            status: z.enum(["pass", "fail"]),
          })
          .strict(),
      )
      .min(1)
      .max(64),
    idempotency_key: z.string().min(1).max(255),
  })
  .strict()
  .superRefine((input, context) => {
    const names = new Set<string>();
    input.checks.forEach((check, index) => {
      if (names.has(check.name)) {
        context.addIssue({
          code: "custom",
          path: ["checks", index, "name"],
          message: "Check names must be unique.",
        });
      }
      names.add(check.name);
    });
  });

export const executeSettlementSchema = z
  .object({
    instruction_id: z.string().min(1).max(128),
    scenario: z.enum(["confirmed", "unknown"]).default("confirmed"),
    idempotency_key: z.string().min(1).max(255),
  })
  .strict();

export const reconcileSettlementSchema = z
  .object({
    instruction_id: z.string().min(1).max(128),
    scenario: z.enum(["confirmed", "mismatch"]).default("confirmed"),
    idempotency_key: z.string().min(1).max(255),
  })
  .strict();

export type CreateWorkOrderInput = z.input<typeof createWorkOrderSchema>;
export type SubmitWorkInput = z.input<typeof submitWorkSchema>;
export type ExecuteSettlementInput = z.input<typeof executeSettlementSchema>;
export type ReconcileSettlementInput = z.input<
  typeof reconcileSettlementSchema
>;
