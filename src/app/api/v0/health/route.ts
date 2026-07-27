import {getPool} from '@/server/db/pool';

import {jsonResult, route} from '../_lib/http';

export const runtime = 'nodejs';

export async function GET() {
  return route(async () => {
    await getPool().query('SELECT 1');
    return jsonResult({
      status: 'ok',
      reason_code: 'SANDBOX_READY',
      next_actions: [],
      resource: {
        service: 'mecharoon-v0',
        settlement_adapter: 'simulated_onchain_v0',
        proof_level: 'simulation',
      },
    });
  });
}
