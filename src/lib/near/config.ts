import { CurrencyConfig } from '@/types';

export type NetworkId = 'mainnet' | 'testnet';

export const CONTRACTS = {
  mainnet: {
    oracle: process.env.NEXT_PUBLIC_MAINNET_ORACLE || 'oracle.nest-beta.near',
    voting: process.env.NEXT_PUBLIC_MAINNET_VOTING || 'voting.nest-beta.near',
    votingToken: process.env.NEXT_PUBLIC_MAINNET_VOTING_TOKEN || 'token.nest-beta.near',
    collateralToken:
      process.env.NEXT_PUBLIC_MAINNET_COLLATERAL_TOKEN ||
      '17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1',
    finder: process.env.NEXT_PUBLIC_MAINNET_FINDER || 'finder.nest-beta.near',
    store: process.env.NEXT_PUBLIC_MAINNET_STORE || 'store.nest-beta.near',
    registry: process.env.NEXT_PUBLIC_MAINNET_REGISTRY || 'registry.nest-beta.near',
    identifierWhitelist:
      process.env.NEXT_PUBLIC_MAINNET_IDENTIFIER_WHITELIST || 'whitelist.nest-beta.near',
    slashingLibrary:
      process.env.NEXT_PUBLIC_MAINNET_SLASHING_LIBRARY || 'slashing.nest-beta.near',
  },
  testnet: {
    oracle: process.env.NEXT_PUBLIC_TESTNET_ORACLE || 'nest-oracle-7.testnet',
    voting: process.env.NEXT_PUBLIC_TESTNET_VOTING || 'nest-voting-5.testnet',
    votingToken: process.env.NEXT_PUBLIC_TESTNET_VOTING_TOKEN || 'nest-token-3.testnet',
    collateralToken:
      process.env.NEXT_PUBLIC_TESTNET_COLLATERAL_TOKEN || 'mocknear-1.testnet',
    finder: process.env.NEXT_PUBLIC_TESTNET_FINDER || 'nest-finder-3.testnet',
    store: process.env.NEXT_PUBLIC_TESTNET_STORE || 'nest-store-3.testnet',
    registry: process.env.NEXT_PUBLIC_TESTNET_REGISTRY || 'nest-registry-3.testnet',
    identifierWhitelist:
      process.env.NEXT_PUBLIC_TESTNET_IDENTIFIER_WHITELIST || 'nest-whitelist-2.testnet',
    slashingLibrary:
      process.env.NEXT_PUBLIC_TESTNET_SLASHING_LIBRARY || 'nest-slashing-3.testnet',
  },
} as const;

export const CURRENCIES: Record<NetworkId, Record<string, CurrencyConfig>> = {
  mainnet: {
    '17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1': {
      symbol: 'USDC',
      decimals: 6,
    },
    'usdc.near': { symbol: 'USDC', decimals: 6 },
    'wrap.near': { symbol: 'wNEAR', decimals: 24 },
  },
  testnet: {
    '3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af': { symbol: 'USDC', decimals: 6 },
    'wrap.testnet': { symbol: 'wNEAR', decimals: 24 },
    'mocknear-1.testnet': { symbol: 'mockNEAR', decimals: 24 },
  },
};

const envNetwork = process.env.NEXT_PUBLIC_NEAR_NETWORK;
export const DEFAULT_NETWORK: NetworkId = envNetwork === 'testnet' ? 'testnet' : 'mainnet';

export function getContracts(networkId: NetworkId = DEFAULT_NETWORK) {
  return CONTRACTS[networkId];
}

export function getCurrencies(networkId: NetworkId = DEFAULT_NETWORK) {
  return CURRENCIES[networkId];
}

export function getCurrencyConfig(
  currencyId: string,
  networkId: NetworkId = DEFAULT_NETWORK
): CurrencyConfig | undefined {
  return CURRENCIES[networkId][currencyId];
}

// Default identifier (ASSERT_TRUTH in bytes32)
export const DEFAULT_IDENTIFIER = '0x4153534552545f5452555448000000000000000000000000000000000000000000';

// Zero bytes32
export const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';
