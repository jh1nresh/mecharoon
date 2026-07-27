import {getPool} from '@/server/db/pool';
import {DomainError} from '@/server/domain/errors';
import {codingPolicyHash} from '@/server/evaluation/coding-v0';
import {createQueryService} from '@/server/queries';

import {assertReputationAccess} from '../../_lib/access';
import {authorize, jsonResult, route} from '../../_lib/http';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  context: {params: Promise<{subjectId: string}>},
) {
  return route(async () => {
    const actor = authorize(request, ['buyer', 'seller', 'operator']);
    const {subjectId} = await context.params;
    const url = new URL(request.url);
    const policyHash =
      url.searchParams.get('policy_hash') ??
      codingPolicyHash(['lint', 'unit']);
    if (!/^[a-f0-9]{64}$/.test(policyHash)) {
      throw new DomainError(
        400,
        'INVALID_POLICY_HASH',
        'policy_hash must be a lowercase SHA-256 hex digest.',
      );
    }

    const pool = getPool();
    await assertReputationAccess(pool, actor, subjectId);
    const reputation = await createQueryService(pool).getReputationView({
      subjectId,
      evaluatorPolicyHash: policyHash,
    });
    return jsonResult({
      status: 'ok',
      reason_code: 'REPUTATION_VIEW_DERIVED',
      next_actions: [],
      resource: reputation,
    });
  });
}
