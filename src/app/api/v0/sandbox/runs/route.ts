import {getPool} from '@/server/db/pool';
import {DomainError} from '@/server/domain/errors';
import {runHostedSandbox} from '@/server/hosted-sandbox';

import {
  authorizeHostedSandbox,
  isHostedSandboxEnabled,
  jsonResult,
  requireIdempotencyKey,
  route,
} from '../../_lib/http';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 64 * 1024;

async function readBoundedBody(request: Request): Promise<string> {
  if (!request.body) {
    return '';
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let raw = '';

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) {
      return raw + decoder.decode();
    }

    bytesRead += chunk.value.byteLength;
    if (bytesRead > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new DomainError(
        413,
        'PAYLOAD_TOO_LARGE',
        'The request body exceeds the 64 KiB sandbox limit.',
      );
    }
    raw += decoder.decode(chunk.value, {stream: true});
  }
}

async function requireFixedWorkflow(request: Request): Promise<void> {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw new DomainError(
      413,
      'PAYLOAD_TOO_LARGE',
      'The request body exceeds the 64 KiB sandbox limit.',
    );
  }

  const raw = await readBoundedBody(request);
  if (!raw.trim()) {
    return;
  }

  try {
    const value = JSON.parse(raw) as unknown;
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    ) {
      return;
    }
  } catch {
    // The fixed hosted workflow has no caller-controlled request body.
  }

  throw new DomainError(
    400,
    'SANDBOX_WORKFLOW_FIXED',
    'This invite runs one fixed coding workflow and accepts no input fields.',
  );
}

export async function POST(request: Request) {
  return route(async () => {
    if (!isHostedSandboxEnabled()) {
      throw new DomainError(
        404,
        'HOSTED_SANDBOX_DISABLED',
        'The invite-only hosted sandbox is not enabled.',
      );
    }

    const {partnerId} = authorizeHostedSandbox(request);
    const idempotencyKey = requireIdempotencyKey(request);
    await requireFixedWorkflow(request);
    const result = await runHostedSandbox(getPool(), {
      partnerId,
      idempotencyKey,
    });

    return jsonResult(result.response, result.replayed ? 200 : 201);
  });
}
