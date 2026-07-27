import {createAgentService} from '@/server/agent';
import {getPool} from '@/server/db/pool';
import {DomainError} from '@/server/domain/errors';
import type {CreateWorkOrderInput} from '@/server/domain/schemas';

import {
  authorize,
  jsonResult,
  readJsonObject,
  requireIdempotencyKey,
  route,
} from '../_lib/http';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return route(async () => {
    const actor = authorize(request, ['buyer']);
    const body = await readJsonObject(request);
    if (body.buyer_id !== actor.participantId) {
      throw new DomainError(
        403,
        'BUYER_SCOPE_MISMATCH',
        'The authenticated buyer must match buyer_id.',
      );
    }

    const result = await createAgentService(getPool()).createWorkOrder({
      ...body,
      idempotency_key: requireIdempotencyKey(request),
    } as CreateWorkOrderInput);
    return jsonResult(result, result.status === 'authorized' ? 201 : 422);
  });
}
