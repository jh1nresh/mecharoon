export class DomainError extends Error {
  readonly httpStatus: number;
  readonly status: number;
  readonly reasonCode: string;
  readonly details?: Record<string, unknown>;

  constructor(
    httpStatus: number,
    reasonCode: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DomainError";
    this.httpStatus = httpStatus;
    this.status = httpStatus;
    this.reasonCode = reasonCode;
    this.details = details;
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
