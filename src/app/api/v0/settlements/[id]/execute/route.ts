import {getPool} from '@/server/db/pool';
import {DomainError} from '@/server/domain/errors';
import type {ExecuteSettlementInput} from '@/server/domain/schemas';
import {createOperatorService} from '@/server/operator';

import {
  authorize,
  jsonResult,
  readJsonObject,
  requireIdempotencyKey,
  route,
} from '../../../_lib/http';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  context: {params: Promise<{id: string}>},
) {
  return route(async () => {
    authorize(request, ['operator']);
    const {id} = await context.params;
    const body = await readJsonObject(request);
    if (body.instruction_id && body.instruction_id !== id) {
      throw new DomainError(
        400,
        'SETTLEMENT_PATH_MISMATCH',
        'instruction_id must match the URL path.',
      );
    }

    const result = await createOperatorService(getPool()).executeSettlement({
      ...body,
      instruction_id: id,
      idempotency_key: requireIdempotencyKey(request),
    } as ExecuteSettlementInput);
    return jsonResult(result, result.status === 'manual_review' ? 409 : 200);
  });
}
