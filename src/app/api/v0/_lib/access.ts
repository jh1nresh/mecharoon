import type {Pool} from 'pg';

import {DomainError} from '@/server/domain/errors';
import type {WorkOrderResource} from '@/server/resources';

import type {ApiActor} from './http';

export function assertWorkOrderAccess(
  actor: ApiActor,
  workOrder: Pick<WorkOrderResource, 'buyer_id' | 'seller_id'>,
): void {
  const allowed =
    actor.role === 'operator' ||
    actor.role === 'evaluator' ||
    (actor.role === 'buyer' && actor.participantId === workOrder.buyer_id) ||
    (actor.role === 'seller' && actor.participantId === workOrder.seller_id);

  if (!allowed) {
    throw new DomainError(
      403,
      'WORK_ORDER_SCOPE_MISMATCH',
      'This identity cannot access the requested work order.',
    );
  }
}

export async function assertAuthorityAccess(
  pool: Pool,
  actor: ApiActor,
  authorityGrantId: string,
): Promise<void> {
  if (actor.role === 'operator') {
    return;
  }

  const result = await pool.query<{
    principal_id: string;
    delegate_id: string;
  }>(
    `
      SELECT principal_id, delegate_id
      FROM mecharoon.authority_grants
      WHERE id = $1
    `,
    [authorityGrantId],
  );
  const authority = result.rows[0];
  if (!authority) {
    throw new DomainError(
      404,
      'AUTHORITY_NOT_FOUND',
      'The authority grant does not exist.',
    );
  }

  const allowed =
    (actor.role === 'buyer' &&
      actor.participantId === authority.principal_id) ||
    (actor.role === 'seller' &&
      actor.participantId === authority.delegate_id);
  if (!allowed) {
    throw new DomainError(
      403,
      'AUTHORITY_SCOPE_MISMATCH',
      'This identity cannot access the requested authority grant.',
    );
  }
}

export async function assertReputationAccess(
  pool: Pool,
  actor: ApiActor,
  subjectId: string,
): Promise<void> {
  if (
    actor.role === 'operator' ||
    (actor.role === 'seller' && actor.participantId === subjectId)
  ) {
    return;
  }

  if (actor.role === 'buyer') {
    const relationship = await pool.query(
      `
        SELECT 1
        FROM mecharoon.authority_grants
        WHERE principal_id = $1
          AND delegate_id = $2
        LIMIT 1
      `,
      [actor.participantId, subjectId],
    );
    if (relationship.rowCount === 1) {
      return;
    }
  }

  throw new DomainError(
    403,
    'REPUTATION_SCOPE_MISMATCH',
    'This identity cannot access the requested reputation context.',
  );
}
