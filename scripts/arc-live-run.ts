import {createAgentService} from '../src/server/agent';
import {sha256} from '../src/server/domain/hash';
import {createPool} from '../src/server/db/pool';
import {createOperatorService} from '../src/server/operator';
import {createQueryService} from '../src/server/queries';
import {settlementProfileFromEnvironment} from '../src/server/settlement/profile';
import {seedDemo} from '../src/server/setup';

const RECONCILE_INTERVAL_MS = 8_000;
const TIMEOUT_MS = 15 * 60_000;

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main(): Promise<void> {
  if (
    process.env.MECHAROON_SETTLEMENT_ADAPTER?.trim() !==
    'arc_testnet_erc8183_v0'
  ) {
    fail(
      'Set MECHAROON_SETTLEMENT_ADAPTER=arc_testnet_erc8183_v0 plus the ' +
        'CIRCLE_* and MECHAROON_ARC_* wallet variables (see ' +
        'scripts/arc-provision.ts output) before running the live loop.',
    );
  }

  const namespace = `arclive${Date.now()}`;
  process.env.MECHAROON_ARC_BUYER_ID = `participant_${namespace}_buyer`;
  process.env.MECHAROON_ARC_SELLER_ID = `participant_${namespace}_seller`;
  const profile = settlementProfileFromEnvironment();

  const pool = createPool();
  try {
    const seed = await seedDemo(pool, {namespace});
    const agent = createAgentService(pool, {settlementProfile: profile});
    const operator = createOperatorService(pool, {});
    const queries = createQueryService(pool);

    const work = await agent.createWorkOrder({
      buyer_id: seed.buyerId,
      seller_id: seed.sellerId,
      authority_grant_id: seed.childAuthorityId,
      amount_minor: '500',
      task_ref: `demo://coding/${namespace}/live`,
      required_checks: ['lint', 'unit'],
      idempotency_key: `${namespace}-live-work`,
    });
    const workResource = work.resource;
    if (!workResource) {
      fail(`Work order was not authorized: ${JSON.stringify(work, null, 2)}`);
    }

    const revision = await agent.submitWork({
      work_order_id: workResource.id,
      artifact_ref: `demo://artifact/${namespace}/revision`,
      artifact_sha256: sha256(`${namespace}:revision`),
      checks: [
        {name: 'lint', status: 'pass'},
        {name: 'unit', status: 'fail'},
      ],
      idempotency_key: `${namespace}-revision`,
    });
    process.stdout.write(
      `REVISE observed for the first artifact (${revision.status}).\n`,
    );

    const pass = await agent.submitWork({
      work_order_id: workResource.id,
      artifact_ref: `demo://artifact/${namespace}/pass`,
      artifact_sha256: sha256(`${namespace}:pass`),
      checks: [
        {name: 'lint', status: 'pass'},
        {name: 'unit', status: 'pass'},
      ],
      idempotency_key: `${namespace}-pass`,
    });
    const instructionId = pass.resource?.settlement_instruction_id;
    if (!instructionId) {
      fail(
        `Passing submission created no settlement instruction: ${JSON.stringify(pass, null, 2)}`,
      );
    }
    process.stdout.write(
      `PASS observed; reservation-bound instruction ${instructionId} created.\n`,
    );

    const startedAt = Date.now();
    let last = await operator.executeSettlement({
      instruction_id: instructionId,
      idempotency_key: `${namespace}-execute`,
    });
    process.stdout.write(
      `execute #0 -> ${last.status} ${JSON.stringify(last.resource ?? null)}\n`,
    );

    let attempt = 0;
    for (;;) {
      const receipt = await queries.getFinalReceipt(workResource.id);
      if (receipt) {
        process.stdout.write('\nFINAL RECEIPT (live Arc Testnet):\n');
        process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
        return;
      }
      if (Date.now() - startedAt > TIMEOUT_MS) {
        fail(
          'Timed out before a FinalReceipt appeared. The reservation stays ' +
            `quarantined; rerun reconcile later. Last response: ${JSON.stringify(last, null, 2)}`,
        );
      }
      await sleep(RECONCILE_INTERVAL_MS);
      attempt += 1;
      last = await operator.reconcileSettlement({
        instruction_id: instructionId,
        idempotency_key: `${namespace}-reconcile-${attempt}`,
      });
      process.stdout.write(
        `reconcile #${attempt} -> ${last.status} ${JSON.stringify(last.resource ?? null)}\n`,
      );
    }
  } finally {
    await pool.end();
  }
}

void main();
