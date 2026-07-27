import {getPool} from '@/server/db/pool';
import {createQueryService} from '@/server/queries';

import {assertWorkOrderAccess} from '../../../_lib/access';
import {authorize, jsonResult, route} from '../../../_lib/http';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  context: {params: Promise<{id: string}>},
) {
  return route(async () => {
    const actor = authorize(request, ['buyer', 'seller', 'operator']);
    const {id} = await context.params;
    const queries = createQueryService(getPool());
    const workOrder = await queries.getWorkOrder(id);
    assertWorkOrderAccess(actor, workOrder);
    const receipt = await queries.getFinalReceipt(id);
    return jsonResult({
      status: receipt ? 'complete' : 'pending',
      reason_code: receipt ? 'FINAL_RECEIPT_FOUND' : 'FINAL_RECEIPT_PENDING',
      next_actions: receipt ? [] : [{action: 'check_settlement_status'}],
      resource: receipt,
    });
  });
}
