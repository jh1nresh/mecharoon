import {getPool} from '@/server/db/pool';
import {createQueryService} from '@/server/queries';

import {assertWorkOrderAccess} from '../../_lib/access';
import {authorize, jsonResult, route} from '../../_lib/http';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  context: {params: Promise<{id: string}>},
) {
  return route(async () => {
    const actor = authorize(request, [
      'buyer',
      'seller',
      'evaluator',
      'operator',
    ]);
    const {id} = await context.params;
    const workOrder = await createQueryService(getPool()).getWorkOrder(id);
    assertWorkOrderAccess(actor, workOrder);
    return jsonResult({
      status: 'ok',
      reason_code: 'WORK_ORDER_FOUND',
      next_actions: [],
      resource: workOrder,
    });
  });
}
