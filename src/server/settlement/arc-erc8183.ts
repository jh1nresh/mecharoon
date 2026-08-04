import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import {
  createPublicClient,
  decodeEventLog,
  getAddress,
  http,
  parseAbi,
  toFunctionSelector,
  type Address,
  type Hash,
  type TransactionReceipt,
} from "viem";
import { defineChain } from "viem";

import { DomainError } from "../domain/errors";
import { sha256 } from "../domain/hash";
import { ARC_TESTNET } from "./profile";
import type {
  SettlementAdapter,
  SettlementInstruction,
  SettlementObservation,
} from "./types";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const EMPTY_BYTES = "0x";

// Circle transaction states that can never progress to COMPLETE.
const TERMINAL_CIRCLE_FAILURE_STATES = new Set(["FAILED", "DENIED", "CANCELLED"]);

const erc8183Abi = parseAbi([
  "function getJob(uint256 jobId) view returns ((uint256 id,address client,address provider,address evaluator,string description,uint256 budget,uint256 expiredAt,uint8 status,address hook))",
  "function paymentToken() view returns (address)",
  "event JobCreated(uint256 indexed jobId,address indexed client,address indexed provider,address evaluator,uint256 expiredAt,address hook)",
  "event JobCompleted(uint256 indexed jobId,address indexed evaluator,bytes32 reason)",
  "event PaymentReleased(uint256 indexed jobId,address indexed provider,uint256 amount)",
]);

type CircleTransactionState =
  | "INITIATED"
  | "QUEUED"
  | "SENT"
  | "CONFIRMED"
  | "COMPLETE"
  | "FAILED"
  | "CANCELLED"
  | "DENIED"
  | "STUCK"
  | string;

export type CircleContractCall = {
  idempotencyKey: string;
  walletId: string;
  contractAddress: Address;
  abiFunctionSignature: string;
  abiParameters: unknown[];
  refId: string;
};

export interface CircleContractGateway {
  createContractCall(input: CircleContractCall): Promise<{ id: string }>;
  getTransaction(id: string): Promise<{
    state: CircleTransactionState;
    txHash: Hash | null;
  }>;
}

type ArcJob = {
  id: bigint;
  client: Address;
  provider: Address;
  evaluator: Address;
  description: string;
  budget: bigint;
  expiredAt: bigint;
  status: number;
  hook: Address;
};

export interface ArcChainReader {
  getChainId(): Promise<number>;
  getPaymentToken(contractAddress: Address): Promise<Address>;
  getJob(contractAddress: Address, jobId: bigint): Promise<ArcJob>;
  getReceipt(txHash: Hash): Promise<TransactionReceipt>;
  getTransactionCall(txHash: Hash): Promise<{
    from: Address;
    to: Address | null;
    input: `0x${string}`;
  }>;
}

export type ArcAdapterConfig = {
  buyerWalletId: string;
  providerWalletId: string;
  evaluatorWalletId: string;
  buyerAddress: Address;
  providerAddress: Address;
  evaluatorAddress: Address;
  contractAddress: Address;
  usdcAddress: Address;
  chainId: number;
  explorerUrl: string;
};

type Step = {
  name: "create" | "approve" | "budget" | "fund" | "submit" | "complete";
  walletId: string;
  callerAddress: Address;
  contractAddress: Address;
  signature: string;
  parameters: unknown[];
};

function uuidV4For(instructionId: string, step: Step["name"]): string {
  const hex = sha256({ instruction_id: instructionId, step }).slice(0, 32);
  const chars = hex.split("");
  chars[12] = "4";
  const variant = Number.parseInt(chars[16] ?? "0", 16);
  chars[16] = ((variant & 0x3) | 0x8).toString(16);
  const normalized = chars.join("");
  return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(16, 20)}-${normalized.slice(20)}`;
}

function usdcAtomicAmount(amountMinor: string): string {
  return (BigInt(amountMinor) * BigInt(10_000)).toString();
}

function transactionEventId(input: {
  instructionId: string;
  step: Step["name"];
  transactionId: string;
  state: string;
  txHash: string | null;
}): string {
  return `arc_evt_${sha256(input).slice(0, 40)}`;
}

function unknownObservation(input: {
  instruction: SettlementInstruction;
  step: Step["name"];
  transactionId: string;
  state: string;
  txHash: Hash | null;
  transactionHashes: string[];
  config: ArcAdapterConfig;
  jobId: bigint | null;
  observationState?: "unknown" | "failed";
}): SettlementObservation {
  return {
    adapterEventId: transactionEventId({
      instructionId: input.instruction.id,
      step: input.step,
      transactionId: input.transactionId,
      state: input.state,
      txHash: input.txHash,
    }),
    state: input.observationState ?? "unknown",
    txHash: null,
    amountMinor: null,
    amountAtomic: null,
    asset: null,
    payerId: null,
    payeeId: null,
    payerAddress: null,
    payeeAddress: null,
    evaluatorAddress: null,
    chainId: input.config.chainId,
    contractAddress: input.config.contractAddress,
    externalJobId: input.jobId?.toString() ?? null,
    externalStatus: `${input.step}:${input.state.toLowerCase()}`,
    explorerUrl: input.txHash
      ? `${input.config.explorerUrl}/tx/${input.txHash}`
      : null,
    transactionHashes: input.transactionHashes,
  };
}

function jobIdFromCreateReceipt(receipt: TransactionReceipt): bigint {
  for (const log of receipt.logs) {
    if (getAddress(log.address) !== getAddress(ARC_TESTNET.erc8183Address)) {
      continue;
    }
    try {
      const decoded = decodeEventLog({
        abi: erc8183Abi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "JobCreated") {
        return decoded.args.jobId;
      }
    } catch {
      // Other logs in the receipt are outside the fixed event allowlist.
    }
  }
  throw new DomainError(
    409,
    "ARC_JOB_CREATED_EVENT_MISSING",
    "The confirmed create transaction did not contain the expected JobCreated event.",
  );
}

function completionEvidence(
  receipt: TransactionReceipt,
  jobId: bigint,
  contractAddress: Address,
): { provider: Address | null; amount: bigint | null; completed: boolean } {
  let provider: Address | null = null;
  let amount: bigint | null = null;
  let completed = false;
  for (const log of receipt.logs) {
    if (getAddress(log.address) !== getAddress(contractAddress)) {
      continue;
    }
    try {
      const decoded = decodeEventLog({
        abi: erc8183Abi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "JobCompleted" && decoded.args.jobId === jobId) {
        completed = true;
      }
      if (decoded.eventName === "PaymentReleased" && decoded.args.jobId === jobId) {
        provider = decoded.args.provider;
        amount = decoded.args.amount;
      }
    } catch {
      // Ignore unrelated ERC-20 and proxy logs.
    }
  }
  return { provider, amount, completed };
}

export class ArcErc8183SettlementAdapter implements SettlementAdapter {
  readonly name = "arc_testnet_erc8183_v0" as const;

  constructor(
    private readonly circle: CircleContractGateway,
    private readonly chain: ArcChainReader,
    private readonly config: ArcAdapterConfig,
  ) {}

  execute(instruction: SettlementInstruction): Promise<SettlementObservation> {
    return this.run(instruction);
  }

  reconcile(instruction: SettlementInstruction): Promise<SettlementObservation> {
    return this.run(instruction);
  }

  private async run(
    instruction: SettlementInstruction,
  ): Promise<SettlementObservation> {
    this.assertFixedInstruction(instruction);

    const atomicAmount = usdcAtomicAmount(instruction.amount_minor);
    const description = `mecharoon:v0:${instruction.instruction_hash}`;
    const transactionHashes: string[] = [];
    let jobId: bigint | null = null;

    const steps = (): Step[] => [
      {
        name: "create",
        walletId: this.config.buyerWalletId,
        callerAddress: this.config.buyerAddress,
        contractAddress: this.config.contractAddress,
        signature: "createJob(address,address,uint256,string,address)",
        parameters: [
          this.config.providerAddress,
          this.config.evaluatorAddress,
          Math.floor(instruction.expires_at.getTime() / 1000).toString(),
          description,
          ZERO_ADDRESS,
        ],
      },
      {
        name: "approve",
        walletId: this.config.buyerWalletId,
        callerAddress: this.config.buyerAddress,
        contractAddress: this.config.usdcAddress,
        signature: "approve(address,uint256)",
        parameters: [this.config.contractAddress, atomicAmount],
      },
      {
        name: "budget",
        walletId: this.config.providerWalletId,
        callerAddress: this.config.providerAddress,
        contractAddress: this.config.contractAddress,
        signature: "setBudget(uint256,uint256,bytes)",
        parameters: [jobId?.toString(), atomicAmount, EMPTY_BYTES],
      },
      {
        name: "fund",
        walletId: this.config.buyerWalletId,
        callerAddress: this.config.buyerAddress,
        contractAddress: this.config.contractAddress,
        signature: "fund(uint256,bytes)",
        parameters: [jobId?.toString(), EMPTY_BYTES],
      },
      {
        name: "submit",
        walletId: this.config.providerWalletId,
        callerAddress: this.config.providerAddress,
        contractAddress: this.config.contractAddress,
        signature: "submit(uint256,bytes32,bytes)",
        parameters: [jobId?.toString(), `0x${instruction.deliverable_hash}`, EMPTY_BYTES],
      },
      {
        name: "complete",
        walletId: this.config.evaluatorWalletId,
        callerAddress: this.config.evaluatorAddress,
        contractAddress: this.config.contractAddress,
        signature: "complete(uint256,bytes32,bytes)",
        parameters: [jobId?.toString(), `0x${instruction.verdict_hash}`, EMPTY_BYTES],
      },
    ];

    let completionReceipt: TransactionReceipt | null = null;
    for (const step of steps()) {
      if (step.name !== "create" && jobId === null) {
        throw new DomainError(409, "ARC_JOB_ID_MISSING", "The Arc job ID is missing.");
      }
      step.parameters = step.parameters.map((parameter) =>
        parameter === undefined ? jobId?.toString() : parameter,
      );
      // The approve step's first parameter is the ERC-8183 spender address;
      // only the job-scoped calls take the job ID first.
      if (step.name !== "create" && step.name !== "approve") {
        step.parameters[0] = jobId?.toString();
      }

      const created = await this.circle.createContractCall({
        idempotencyKey: uuidV4For(instruction.id, step.name),
        walletId: step.walletId,
        contractAddress: step.contractAddress,
        abiFunctionSignature: step.signature,
        abiParameters: step.parameters,
        refId: `mecharoon:${instruction.id}:${step.name}`,
      });
      const transaction = await this.circle.getTransaction(created.id);
      if (transaction.txHash) {
        transactionHashes.push(transaction.txHash);
      }
      if (TERMINAL_CIRCLE_FAILURE_STATES.has(transaction.state)) {
        // The deterministic idempotency key pins this transaction forever,
        // so retrying can never succeed; surface it for manual review
        // instead of leaving the reservation in permanent quarantine.
        return unknownObservation({
          instruction,
          step: step.name,
          transactionId: created.id,
          state: transaction.state,
          txHash: transaction.txHash,
          transactionHashes,
          config: this.config,
          jobId,
          observationState: "failed",
        });
      }
      if (transaction.state !== "COMPLETE" || !transaction.txHash) {
        return unknownObservation({
          instruction,
          step: step.name,
          transactionId: created.id,
          state: transaction.state,
          txHash: transaction.txHash,
          transactionHashes,
          config: this.config,
          jobId,
        });
      }

      const [receipt, transactionCall] = await Promise.all([
        this.chain.getReceipt(transaction.txHash),
        this.chain.getTransactionCall(transaction.txHash),
      ]);
      if (receipt.status !== "success") {
        return unknownObservation({
          instruction,
          step: step.name,
          transactionId: created.id,
          state: "REVERTED",
          txHash: transaction.txHash,
          transactionHashes,
          config: this.config,
          jobId,
        });
      }
      if (
        !transactionCall.to ||
        getAddress(transactionCall.to) !== getAddress(step.contractAddress) ||
        getAddress(transactionCall.from) !== getAddress(step.callerAddress) ||
        transactionCall.input.slice(0, 10).toLowerCase() !==
          toFunctionSelector(step.signature).toLowerCase()
      ) {
        return {
          ...unknownObservation({
            instruction,
            step: step.name,
            transactionId: created.id,
            state: "EVIDENCE_MISMATCH",
            txHash: transaction.txHash,
            transactionHashes,
            config: this.config,
            jobId,
          }),
          state: "confirmed",
          txHash: transaction.txHash,
        };
      }
      if (step.name === "create") {
        jobId = jobIdFromCreateReceipt(receipt);
      }
      if (step.name === "complete") {
        completionReceipt = receipt;
      }
    }

    if (jobId === null || completionReceipt === null) {
      throw new DomainError(409, "ARC_COMPLETION_EVIDENCE_MISSING", "Arc completion evidence is missing.");
    }

    const [chainId, paymentToken, job] = await Promise.all([
      this.chain.getChainId(),
      this.chain.getPaymentToken(this.config.contractAddress),
      this.chain.getJob(this.config.contractAddress, jobId),
    ]);
    const released = completionEvidence(
      completionReceipt,
      jobId,
      this.config.contractAddress,
    );
    const confirmed =
      chainId === this.config.chainId &&
      getAddress(paymentToken) === getAddress(this.config.usdcAddress) &&
      job.status === 3 &&
      getAddress(job.client) === getAddress(this.config.buyerAddress) &&
      getAddress(job.provider) === getAddress(this.config.providerAddress) &&
      getAddress(job.evaluator) === getAddress(this.config.evaluatorAddress) &&
      job.description === description &&
      job.budget.toString() === atomicAmount &&
      released.completed &&
      released.provider !== null &&
      getAddress(released.provider) === getAddress(this.config.providerAddress) &&
      released.amount?.toString() === atomicAmount;

    return {
      adapterEventId: `arc_final_${sha256({ instruction_id: instruction.id, job_id: jobId.toString(), tx_hash: completionReceipt.transactionHash }).slice(0, 40)}`,
      state: "confirmed",
      txHash: completionReceipt.transactionHash,
      amountMinor: confirmed ? instruction.amount_minor : null,
      amountAtomic: released.amount?.toString() ?? job.budget.toString(),
      asset: getAddress(paymentToken) === getAddress(this.config.usdcAddress) ? "USDC" : paymentToken,
      payerId: confirmed ? instruction.payer_id : null,
      payeeId: confirmed ? instruction.payee_id : null,
      payerAddress: job.client,
      payeeAddress: released.provider ?? job.provider,
      evaluatorAddress: job.evaluator,
      chainId,
      contractAddress: this.config.contractAddress,
      externalJobId: jobId.toString(),
      externalStatus: job.status.toString(),
      explorerUrl: `${this.config.explorerUrl}/tx/${completionReceipt.transactionHash}`,
      transactionHashes,
    };
  }

  private assertFixedInstruction(instruction: SettlementInstruction): void {
    if (
      instruction.adapter !== this.name ||
      instruction.chain !== "arc_testnet" ||
      instruction.asset !== "USDC" ||
      !instruction.payer_address ||
      !instruction.payee_address ||
      !instruction.evaluator_address ||
      !instruction.contract_address ||
      getAddress(instruction.payer_address) !== getAddress(this.config.buyerAddress) ||
      getAddress(instruction.payee_address) !== getAddress(this.config.providerAddress) ||
      getAddress(instruction.evaluator_address) !== getAddress(this.config.evaluatorAddress) ||
      getAddress(instruction.contract_address) !== getAddress(this.config.contractAddress)
    ) {
      throw new DomainError(
        409,
        "ARC_SETTLEMENT_PROFILE_MISMATCH",
        "The instruction does not match the fixed Arc Testnet settlement profile.",
      );
    }
  }
}

function requiredSecret(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new DomainError(503, "ARC_EXECUTOR_NOT_CONFIGURED", `The Arc executor requires ${name}.`);
  }
  return value;
}

export function createArcAdapterFromEnvironment(): ArcErc8183SettlementAdapter {
  const apiKey = requiredSecret("CIRCLE_API_KEY");
  const entitySecret = requiredSecret("CIRCLE_ENTITY_SECRET");
  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
  const chain = defineChain({
    id: ARC_TESTNET.chainId,
    name: "Arc Testnet",
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
    rpcUrls: { default: { http: [ARC_TESTNET.rpcUrl] } },
    blockExplorers: { default: { name: "Arcscan", url: ARC_TESTNET.explorerUrl } },
    testnet: true,
  });
  const publicClient = createPublicClient({ chain, transport: http(ARC_TESTNET.rpcUrl) });

  const circleGateway: CircleContractGateway = {
    async createContractCall(input) {
      const response = await client.createContractExecutionTransaction({
        ...input,
        fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      });
      const id = response.data?.id;
      if (!id) {
        throw new DomainError(502, "CIRCLE_TRANSACTION_ID_MISSING", "Circle returned no transaction ID.");
      }
      return { id };
    },
    async getTransaction(id) {
      const response = await client.getTransaction({ id });
      return {
        state: response.data?.transaction?.state ?? "UNKNOWN",
        txHash: (response.data?.transaction?.txHash as Hash | undefined) ?? null,
      };
    },
  };

  const chainReader: ArcChainReader = {
    getChainId: () => publicClient.getChainId(),
    async getPaymentToken(contractAddress) {
      return publicClient.readContract({ address: contractAddress, abi: erc8183Abi, functionName: "paymentToken" });
    },
    async getJob(contractAddress, jobId) {
      const job = await publicClient.readContract({
        address: contractAddress,
        abi: erc8183Abi,
        functionName: "getJob",
        args: [jobId],
      });
      return { ...job, status: Number(job.status) };
    },
    getReceipt: (txHash) => publicClient.getTransactionReceipt({ hash: txHash }),
    async getTransactionCall(txHash) {
      const transaction = await publicClient.getTransaction({ hash: txHash });
      return {
        from: transaction.from,
        to: transaction.to,
        input: transaction.input,
      };
    },
  };

  return new ArcErc8183SettlementAdapter(circleGateway, chainReader, {
    buyerWalletId: requiredSecret("MECHAROON_ARC_BUYER_WALLET_ID"),
    providerWalletId: requiredSecret("MECHAROON_ARC_PROVIDER_WALLET_ID"),
    evaluatorWalletId: requiredSecret("MECHAROON_ARC_EVALUATOR_WALLET_ID"),
    buyerAddress: getAddress(requiredSecret("MECHAROON_ARC_BUYER_ADDRESS")),
    providerAddress: getAddress(requiredSecret("MECHAROON_ARC_PROVIDER_ADDRESS")),
    evaluatorAddress: getAddress(requiredSecret("MECHAROON_ARC_EVALUATOR_ADDRESS")),
    contractAddress: getAddress(ARC_TESTNET.erc8183Address),
    usdcAddress: getAddress(ARC_TESTNET.usdcAddress),
    chainId: ARC_TESTNET.chainId,
    explorerUrl: ARC_TESTNET.explorerUrl,
  });
}
