import assert from "node:assert/strict";
import test from "node:test";

import {
  encodeAbiParameters,
  getAddress,
  keccak256,
  padHex,
  toFunctionSelector,
  toBytes,
  type Address,
  type Hash,
  type TransactionReceipt,
} from "viem";

import {
  ArcErc8183SettlementAdapter,
  type ArcAdapterConfig,
  type ArcChainReader,
  type CircleContractCall,
  type CircleContractGateway,
} from "../../src/server/settlement/arc-erc8183";
import { ARC_TESTNET } from "../../src/server/settlement/profile";
import type { SettlementInstruction } from "../../src/server/settlement/types";

const buyer = getAddress("0x1111111111111111111111111111111111111111");
const provider = getAddress("0x2222222222222222222222222222222222222222");
const evaluator = getAddress("0x3333333333333333333333333333333333333333");
const contract = getAddress(ARC_TESTNET.erc8183Address);
const usdc = getAddress(ARC_TESTNET.usdcAddress);
const jobId = BigInt(7);

const config: ArcAdapterConfig = {
  buyerWalletId: "wallet-buyer",
  providerWalletId: "wallet-provider",
  evaluatorWalletId: "wallet-evaluator",
  buyerAddress: buyer,
  providerAddress: provider,
  evaluatorAddress: evaluator,
  contractAddress: contract,
  usdcAddress: usdc,
  chainId: ARC_TESTNET.chainId,
  explorerUrl: ARC_TESTNET.explorerUrl,
};

const instruction: SettlementInstruction = {
  id: "si_arc_1",
  adapter: "arc_testnet_erc8183_v0",
  chain: "arc_testnet",
  instruction_hash: "a".repeat(64),
  verdict_hash: "b".repeat(64),
  deliverable_hash: "c".repeat(64),
  amount_minor: "500",
  asset: "USDC",
  payer_id: "participant_demo_buyer",
  payee_id: "participant_demo_seller",
  payer_address: buyer,
  payee_address: provider,
  evaluator_address: evaluator,
  contract_address: contract,
  expires_at: new Date("2026-08-03T12:00:00.000Z"),
};

function eventTopic(signature: string): Hash {
  return keccak256(toBytes(signature));
}

function indexedUint(value: bigint): Hash {
  return padHex(`0x${value.toString(16)}`, { size: 32 });
}

function indexedAddress(value: Address): Hash {
  return padHex(value, { size: 32 });
}

function receipt(step: string, hash: Hash, amount = BigInt(5_000_000)): TransactionReceipt {
  const logs = [] as TransactionReceipt["logs"];
  if (step === "create") {
    logs.push({
      address: contract,
      topics: [
        eventTopic("JobCreated(uint256,address,address,address,uint256,address)"),
        indexedUint(jobId),
        indexedAddress(buyer),
        indexedAddress(provider),
      ],
      data: encodeAbiParameters(
        [
          { type: "address" },
          { type: "uint256" },
          { type: "address" },
        ],
        [evaluator, BigInt(Math.floor(instruction.expires_at.getTime() / 1000)), getAddress("0x0000000000000000000000000000000000000000")],
      ),
      blockHash: hash,
      blockNumber: BigInt(1),
      transactionHash: hash,
      transactionIndex: 0,
      logIndex: 0,
      removed: false,
    });
  }
  if (step === "complete") {
    logs.push(
      {
        address: contract,
        topics: [
          eventTopic("JobCompleted(uint256,address,bytes32)"),
          indexedUint(jobId),
          indexedAddress(evaluator),
        ],
        data: encodeAbiParameters([{ type: "bytes32" }], [`0x${instruction.verdict_hash}`]),
        blockHash: hash,
        blockNumber: BigInt(1),
        transactionHash: hash,
        transactionIndex: 0,
        logIndex: 0,
        removed: false,
      },
      {
        address: contract,
        topics: [
          eventTopic("PaymentReleased(uint256,address,uint256)"),
          indexedUint(jobId),
          indexedAddress(provider),
        ],
        data: encodeAbiParameters([{ type: "uint256" }], [amount]),
        blockHash: hash,
        blockNumber: BigInt(1),
        transactionHash: hash,
        transactionIndex: 0,
        logIndex: 1,
        removed: false,
      },
    );
  }
  return {
    blockHash: hash,
    blockNumber: BigInt(1),
    contractAddress: null,
    cumulativeGasUsed: BigInt(1),
    effectiveGasPrice: BigInt(1),
    from: buyer,
    gasUsed: BigInt(1),
    logs,
    logsBloom: `0x${"0".repeat(512)}`,
    status: "success",
    to: contract,
    transactionHash: hash,
    transactionIndex: 0,
    type: "eip1559",
  };
}

function harness(
  options: {
    pendingStep?: string;
    failedStep?: string;
    observedAmount?: bigint;
    mismatchedCallStep?: string;
  } = {},
) {
  const calls: CircleContractCall[] = [];
  const stepById = new Map<string, string>();
  const circle: CircleContractGateway = {
    async createContractCall(input) {
      calls.push(input);
      const step = input.refId.split(":").at(-1) ?? "unknown";
      const id = `circle-${step}`;
      stepById.set(id, step);
      return { id };
    },
    async getTransaction(id) {
      const step = stepById.get(id) ?? "unknown";
      if (step === options.pendingStep) {
        return { state: "QUEUED", txHash: null };
      }
      if (step === options.failedStep) {
        return { state: "FAILED", txHash: null };
      }
      return { state: "COMPLETE", txHash: `0x${step.padEnd(64, "0")}` as Hash };
    },
  };
  const chain: ArcChainReader = {
    async getChainId() {
      return ARC_TESTNET.chainId;
    },
    async getPaymentToken() {
      return usdc;
    },
    async getJob() {
      return {
        id: jobId,
        client: buyer,
        provider,
        evaluator,
        description: `mecharoon:v0:${instruction.instruction_hash}`,
        budget: options.observedAmount ?? BigInt(5_000_000),
        expiredAt: BigInt(Math.floor(instruction.expires_at.getTime() / 1000)),
        status: 3,
        hook: getAddress("0x0000000000000000000000000000000000000000"),
      };
    },
    async getReceipt(hash) {
      const step = [...stepById].find(([, value]) => hash.startsWith(`0x${value}`))?.[1] ?? "unknown";
      return receipt(step, hash, options.observedAmount);
    },
    async getTransactionCall(hash) {
      const step = [...stepById].find(([, value]) => hash.startsWith(`0x${value}`))?.[1] ?? "unknown";
      const call = calls.find((candidate) => candidate.refId.endsWith(`:${step}`));
      if (!call) {
        throw new Error(`Missing call for ${step}`);
      }
      const from =
        call.walletId === config.providerWalletId
          ? provider
          : call.walletId === config.evaluatorWalletId
            ? evaluator
            : buyer;
      return {
        from,
        to: call.contractAddress,
        input:
          step === options.mismatchedCallStep
            ? toFunctionSelector("reject(uint256,bytes32,bytes)")
            : toFunctionSelector(call.abiFunctionSignature),
      };
    },
  };
  return {
    adapter: new ArcErc8183SettlementAdapter(circle, chain, config),
    calls,
  };
}

test("Arc ERC-8183 adapter executes only the fixed six-step USDC job flow", async () => {
  const { adapter, calls } = harness();
  const observation = await adapter.execute(instruction);

  assert.equal(observation.state, "confirmed");
  assert.equal(observation.amountMinor, "500");
  assert.equal(observation.amountAtomic, "5000000");
  assert.equal(observation.externalJobId, "7");
  assert.equal(observation.externalStatus, "3");
  assert.equal(calls.length, 6);
  assert.deepEqual(
    calls.map((call) => call.abiFunctionSignature),
    [
      "createJob(address,address,uint256,string,address)",
      "approve(address,uint256)",
      "setBudget(uint256,uint256,bytes)",
      "fund(uint256,bytes)",
      "submit(uint256,bytes32,bytes)",
      "complete(uint256,bytes32,bytes)",
    ],
  );
  assert.equal(calls[1]?.abiParameters[0], config.contractAddress);
  assert.equal(calls[1]?.abiParameters[1], "5000000");
  assert.deepEqual(
    calls.slice(2).map((call) => call.abiParameters[0]),
    ["7", "7", "7", "7"],
  );
  assert.equal(calls[2]?.walletId, config.providerWalletId);
  assert.equal(new Set(calls.map((call) => call.idempotencyKey)).size, 6);

  const firstKeys = calls.map((call) => call.idempotencyKey);
  await adapter.execute(instruction);
  assert.deepEqual(
    calls.slice(6).map((call) => call.idempotencyKey),
    firstKeys,
  );
});

test("a pending Circle step returns unknown and does not advance economic effects", async () => {
  const { adapter, calls } = harness({ pendingStep: "fund" });
  const observation = await adapter.execute(instruction);

  assert.equal(observation.state, "unknown");
  assert.equal(observation.externalStatus, "fund:queued");
  assert.equal(observation.amountMinor, null);
  assert.equal(calls.length, 4);
});

test("a terminally failed Circle step returns failed for manual review", async () => {
  const { adapter, calls } = harness({ failedStep: "approve" });
  const observation = await adapter.execute(instruction);

  assert.equal(observation.state, "failed");
  assert.equal(observation.externalStatus, "approve:failed");
  assert.equal(observation.amountMinor, null);
  assert.equal(observation.txHash, null);
  assert.equal(calls.length, 2);
});

test("mismatched Arc amount never produces a matching local amount", async () => {
  const { adapter } = harness({ observedAmount: BigInt(5_000_001) });
  const observation = await adapter.execute(instruction);

  assert.equal(observation.state, "confirmed");
  assert.equal(observation.amountMinor, null);
  assert.equal(observation.amountAtomic, "5000001");
});

test("a fetched transaction with unexpected calldata is terminal mismatch evidence", async () => {
  const { adapter, calls } = harness({ mismatchedCallStep: "fund" });
  const observation = await adapter.execute(instruction);

  assert.equal(observation.state, "confirmed");
  assert.equal(observation.amountMinor, null);
  assert.equal(observation.externalStatus, "fund:evidence_mismatch");
  assert.equal(calls.length, 4);
});

test("an instruction outside the fixed wallet mapping fails before Circle is called", async () => {
  const { adapter, calls } = harness();
  await assert.rejects(
    adapter.execute({ ...instruction, payee_address: buyer }),
    /fixed Arc Testnet settlement profile/,
  );
  assert.equal(calls.length, 0);
});
