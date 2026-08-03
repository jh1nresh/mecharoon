import { getAddress } from "viem";

import { DomainError } from "../domain/errors";
import type { SettlementAdapterName } from "./types";

export const ARC_TESTNET = {
  chainId: 5_042_002,
  rpcUrl: "https://rpc.testnet.arc.io",
  explorerUrl: "https://testnet.arcscan.app",
  usdcAddress: "0x3600000000000000000000000000000000000000",
  erc8183Address: "0x0747EEf0706327138c69792bF28Cd525089e4583",
  usdcDecimals: 6,
} as const;

export type SimulatedSettlementProfile = {
  adapter: "simulated_onchain_v0";
  chain: "simulated";
  audience: "simulated-onchain-v0";
};

export type ArcSettlementProfile = {
  adapter: "arc_testnet_erc8183_v0";
  chain: "arc_testnet";
  audience: "arc-testnet-erc8183-v0";
  buyerId: string;
  sellerId: string;
  payerAddress: `0x${string}`;
  payeeAddress: `0x${string}`;
  evaluatorAddress: `0x${string}`;
  contractAddress: `0x${string}`;
};

export type SettlementProfile = SimulatedSettlementProfile | ArcSettlementProfile;

export const simulatedSettlementProfile: SimulatedSettlementProfile = {
  adapter: "simulated_onchain_v0",
  chain: "simulated",
  audience: "simulated-onchain-v0",
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new DomainError(
      503,
      "ARC_SETTLEMENT_NOT_CONFIGURED",
      `The fixed Arc Testnet settlement profile requires ${name}.`,
    );
  }
  return value;
}

function configuredAddress(name: string, expected?: string): `0x${string}` {
  let address: `0x${string}`;
  try {
    address = getAddress(required(name));
  } catch {
    throw new DomainError(
      503,
      "ARC_SETTLEMENT_INVALID_ADDRESS",
      `${name} must be a valid EVM address.`,
    );
  }
  if (expected && address !== getAddress(expected)) {
    throw new DomainError(
      503,
      "ARC_SETTLEMENT_FIXED_TARGET_MISMATCH",
      `${name} does not match the allowlisted Arc Testnet target.`,
    );
  }
  return address;
}

export function settlementProfileFromEnvironment(): SettlementProfile {
  const adapter = process.env.MECHAROON_SETTLEMENT_ADAPTER?.trim() as
    | SettlementAdapterName
    | undefined;
  if (!adapter || adapter === "simulated_onchain_v0") {
    return simulatedSettlementProfile;
  }
  if (adapter !== "arc_testnet_erc8183_v0") {
    throw new DomainError(
      503,
      "SETTLEMENT_ADAPTER_NOT_ALLOWED",
      "Only the simulated or fixed Arc Testnet ERC-8183 adapter is allowed.",
    );
  }

  return {
    adapter,
    chain: "arc_testnet",
    audience: "arc-testnet-erc8183-v0",
    buyerId: required("MECHAROON_ARC_BUYER_ID"),
    sellerId: required("MECHAROON_ARC_SELLER_ID"),
    payerAddress: configuredAddress("MECHAROON_ARC_BUYER_ADDRESS"),
    payeeAddress: configuredAddress("MECHAROON_ARC_PROVIDER_ADDRESS"),
    evaluatorAddress: configuredAddress("MECHAROON_ARC_EVALUATOR_ADDRESS"),
    contractAddress: configuredAddress(
      "MECHAROON_ARC_ERC8183_CONTRACT_ADDRESS",
      ARC_TESTNET.erc8183Address,
    ),
  };
}
