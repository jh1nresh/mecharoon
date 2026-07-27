import { DomainError } from "./errors";

const DECIMAL_INTEGER = /^(0|[1-9][0-9]*)$/;

export function parseMinorAmount(value: string | bigint): bigint {
  if (typeof value === "bigint") {
    if (value <= BigInt(0)) {
      throw new DomainError(422, "INVALID_AMOUNT", "Amount must be positive.");
    }
    return value;
  }

  if (!DECIMAL_INTEGER.test(value)) {
    throw new DomainError(
      422,
      "INVALID_AMOUNT",
      "Amount must be a positive decimal integer string.",
    );
  }

  const amount = BigInt(value);
  if (amount <= BigInt(0)) {
    throw new DomainError(422, "INVALID_AMOUNT", "Amount must be positive.");
  }
  return amount;
}

export function minorToJson(value: bigint | string): string {
  return typeof value === "bigint" ? value.toString() : BigInt(value).toString();
}
