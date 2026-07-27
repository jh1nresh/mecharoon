import { sha256 } from "../domain/hash";

export type NormalizedCheck = {
  name: string;
  status: "pass" | "fail";
};

export type CodingVerdict = {
  outcome: "revise" | "pass";
  reasonCodes: string[];
  verdictHash: string;
};

export const CODING_POLICY = {
  id: "required-checks-v1",
  version: 1,
} as const;

export function codingPolicyHash(requiredChecks: string[]): string {
  return sha256({
    policy_id: CODING_POLICY.id,
    policy_version: CODING_POLICY.version,
    required_checks: [...new Set(requiredChecks)].sort(),
  });
}

export function evaluateCodingSubmission(
  requiredChecks: string[],
  checks: NormalizedCheck[],
): CodingVerdict {
  const observed = new Map(checks.map((check) => [check.name, check.status]));
  const failed = [...new Set(requiredChecks)]
    .sort()
    .filter((name) => observed.get(name) !== "pass");
  const outcome = failed.length === 0 ? "pass" : "revise";
  const reasonCodes =
    outcome === "pass"
      ? ["ALL_REQUIRED_CHECKS_PASSED"]
      : ["REQUIRED_CHECK_FAILED"];

  return {
    outcome,
    reasonCodes,
    verdictHash: sha256({
      policy_hash: codingPolicyHash(requiredChecks),
      required_checks: [...new Set(requiredChecks)].sort(),
      observed_checks: [...observed.entries()].sort(([left], [right]) =>
        left.localeCompare(right),
      ),
      outcome,
      reason_codes: reasonCodes,
    }),
  };
}
