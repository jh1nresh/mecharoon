import {createHash, timingSafeEqual} from 'node:crypto';

import {NextResponse} from 'next/server';
import {ZodError} from 'zod';

import {DomainError} from '@/server/domain/errors';

export type ApiRole = 'buyer' | 'seller' | 'evaluator' | 'operator';

export type ApiActor = {
  participantId: string;
  role: ApiRole;
};

type ApiFailure = {
  status: 'error';
  reason_code: string;
  next_actions: [];
  resource: null;
  message: string;
};

const NO_STORE_HEADERS = {
  'cache-control': 'no-store, max-age=0',
} as const;

function failure(status: number, reasonCode: string, message: string) {
  return NextResponse.json<ApiFailure>(
    {
      status: 'error',
      reason_code: reasonCode,
      next_actions: [],
      resource: null,
      message,
    },
    {status, headers: NO_STORE_HEADERS},
  );
}

function safeTokenEqual(left: string, right: string): boolean {
  const leftDigest = createHash('sha256').update(left).digest();
  const rightDigest = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

function credentials() {
  return {
    buyerId: process.env.MECHAROON_BUYER_ID ?? '',
    buyerToken: process.env.MECHAROON_BUYER_TOKEN ?? '',
    sellerId: process.env.MECHAROON_SELLER_ID ?? '',
    sellerToken: process.env.MECHAROON_SELLER_TOKEN ?? '',
    evaluatorToken: process.env.MECHAROON_EVALUATOR_TOKEN ?? '',
    operatorToken: process.env.MECHAROON_OPERATOR_TOKEN ?? '',
    demoToken: process.env.MECHAROON_DEMO_TOKEN ?? '',
  };
}

function assertDistinctRoleTokens(configured: ReturnType<typeof credentials>) {
  const tokens = [
    configured.buyerToken,
    configured.sellerToken,
    configured.evaluatorToken,
    configured.operatorToken,
    configured.demoToken,
  ].filter(Boolean);
  if (new Set(tokens).size !== tokens.length) {
    throw new DomainError(
      503,
      'AUTH_CONFIGURATION_INVALID',
      'Each API role and the demo runner must use a distinct bearer token.',
    );
  }
}

export function isLocalDemoEnabled(): boolean {
  return (
    process.env.MECHAROON_DEMO_MODE === 'true' &&
    process.env.NODE_ENV !== 'production'
  );
}

export function authorize(
  request: Request,
  allowedRoles: readonly ApiRole[] = ['buyer'],
): ApiActor {
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';
  const configured = credentials();
  assertDistinctRoleTokens(configured);

  if (!token) {
    throw new DomainError(
      401,
      'AUTHENTICATION_REQUIRED',
      'A configured scoped bearer token is required.',
    );
  }

  const actors: ApiActor[] = [];
  if (
    configured.operatorToken &&
    safeTokenEqual(token, configured.operatorToken)
  ) {
    actors.push({participantId: 'system_demo', role: 'operator'});
  }
  if (
    configured.evaluatorToken &&
    safeTokenEqual(token, configured.evaluatorToken)
  ) {
    actors.push({participantId: 'system_evaluator', role: 'evaluator'});
  }
  if (
    configured.buyerId &&
    configured.buyerToken &&
    safeTokenEqual(token, configured.buyerToken)
  ) {
    actors.push({participantId: configured.buyerId, role: 'buyer'});
  }
  if (
    configured.sellerId &&
    configured.sellerToken &&
    safeTokenEqual(token, configured.sellerToken)
  ) {
    actors.push({participantId: configured.sellerId, role: 'seller'});
  }

  const actor = actors[0];
  if (!actor) {
    throw new DomainError(
      401,
      'INVALID_CREDENTIALS',
      'The bearer token is not valid for this sandbox.',
    );
  }
  if (allowedRoles.includes(actor.role)) {
    return actor;
  }

  throw new DomainError(
    403,
    'INSUFFICIENT_ROLE',
    'This token cannot perform the requested operation.',
  );
}

export function authorizeDemo(request: Request): void {
  const configured = credentials();
  assertDistinctRoleTokens(configured);
  const configuredToken = configured.demoToken;
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';

  if (!configuredToken) {
    throw new DomainError(
      503,
      'DEMO_AUTH_NOT_CONFIGURED',
      'Set MECHAROON_DEMO_TOKEN before using the local demo runner.',
    );
  }
  if (!token || !safeTokenEqual(token, configuredToken)) {
    throw new DomainError(
      401,
      'DEMO_AUTHENTICATION_REQUIRED',
      'A valid local demo bearer token is required.',
    );
  }
}

export function requireIdempotencyKey(request: Request): string {
  const key = request.headers.get('idempotency-key')?.trim();
  if (!key || key.length > 255) {
    throw new DomainError(
      400,
      'IDEMPOTENCY_KEY_REQUIRED',
      'Mutations require an Idempotency-Key header of at most 255 characters.',
    );
  }
  return key;
}

export async function readJson(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > 64 * 1024) {
    throw new DomainError(
      413,
      'PAYLOAD_TOO_LARGE',
      'The request body exceeds the 64 KiB sandbox limit.',
    );
  }

  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 64 * 1024) {
      throw new DomainError(
        413,
        'PAYLOAD_TOO_LARGE',
        'The request body exceeds the 64 KiB sandbox limit.',
      );
    }
    return JSON.parse(raw) as unknown;
  } catch (error) {
    if (error instanceof DomainError) {
      throw error;
    }
    throw new DomainError(400, 'INVALID_JSON', 'The request body must be valid JSON.');
  }
}

export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown>> {
  const value = await readJson(request);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DomainError(
      400,
      'INVALID_JSON_OBJECT',
      'The request body must be a JSON object.',
    );
  }
  return value as Record<string, unknown>;
}

export function jsonResult<T>(result: T, status = 200) {
  return NextResponse.json(result, {status, headers: NO_STORE_HEADERS});
}

export async function route(
  operation: () => Promise<Response>,
): Promise<Response> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof DomainError) {
      return failure(error.httpStatus, error.reasonCode, error.message);
    }

    if (error instanceof ZodError) {
      return failure(
        400,
        'VALIDATION_FAILED',
        error.issues.map((issue) => issue.message).join('; '),
      );
    }

    console.error('Mecharoon API error', error);
    return failure(
      500,
      'INTERNAL_ERROR',
      'The sandbox could not complete the request.',
    );
  }
}
