import {createAgentService} from '@/server/agent';
import {getPool} from '@/server/db/pool';
import {DomainError} from '@/server/domain/errors';
import type {SubmitWorkInput} from '@/server/domain/schemas';
import {createQueryService} from '@/server/queries';

import {assertWorkOrderAccess} from '../../../_lib/access';
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
    const actor = authorize(request, ['evaluator']);
    const {id} = await context.params;
    const body = await readJsonObject(request);
    if (body.work_order_id && body.work_order_id !== id) {
      throw new DomainError(
        400,
        'WORK_ORDER_PATH_MISMATCH',
        'work_order_id must match the URL path.',
      );
    }

    const workOrder = await createQueryService(getPool()).getWorkOrder(id);
    assertWorkOrderAccess(actor, workOrder);
    const result = await createAgentService(getPool()).submitWork({
      ...body,
      work_order_id: id,
      idempotency_key: requireIdempotencyKey(request),
    } as SubmitWorkInput);
    return jsonResult(result, 201);
  });
}
