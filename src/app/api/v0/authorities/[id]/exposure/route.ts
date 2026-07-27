import {getPool} from '@/server/db/pool';
import {createQueryService} from '@/server/queries';

import {assertAuthorityAccess} from '../../../_lib/access';
import {authorize, jsonResult, route} from '../../../_lib/http';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  context: {params: Promise<{id: string}>},
) {
  return route(async () => {
    const actor = authorize(request, ['buyer', 'seller', 'operator']);
    const {id} = await context.params;
    const pool = getPool();
    await assertAuthorityAccess(pool, actor, id);
    const exposure = await createQueryService(pool).getAuthorityExposure(id);
    return jsonResult({
      status: 'ok',
      reason_code: 'AUTHORITY_EXPOSURE_FOUND',
      next_actions: [],
      resource: exposure,
    });
  });
}
