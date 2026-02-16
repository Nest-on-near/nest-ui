import { CurrencyConfig } from '@/types';

export type NetworkId = 'mainnet' | 'testnet';

export const CONTRACTS = {
  mainnet: {
    oracle: process.env.NEXT_PUBLIC_MAINNET_ORACLE || 'nest-oracle.near',
    voting: process.env.NEXT_PUBLIC_MAINNET_VOTING || 'nest-voting.near',
    votingToken: process.env.NEXT_PUBLIC_MAINNET_VOTING_TOKEN || 'nest-token.near',
    vault: process.env.NEXT_PUBLIC_MAINNET_VAULT || 'nest-vault.near',
    collateralToken: process.env.NEXT_PUBLIC_MAINNET_COLLATERAL_TOKEN || 'wrap.near',
    finder: process.env.NEXT_PUBLIC_MAINNET_FINDER || 'nest-finder.near',
    store: process.env.NEXT_PUBLIC_MAINNET_STORE || 'nest-store.near',
    registry: process.env.NEXT_PUBLIC_MAINNET_REGISTRY || 'nest-registry.near',
    identifierWhitelist:
      process.env.NEXT_PUBLIC_MAINNET_IDENTIFIER_WHITELIST || 'nest-identifiers.near',
    slashingLibrary: process.env.NEXT_PUBLIC_MAINNET_SLASHING_LIBRARY || 'nest-slashing.near',
  },
  testnet: {
    oracle: process.env.NEXT_PUBLIC_TESTNET_ORACLE || 'nest-oracle-6.testnet',
    voting: process.env.NEXT_PUBLIC_TESTNET_VOTING || 'nest-voting-4.testnet',
    votingToken: process.env.NEXT_PUBLIC_TESTNET_VOTING_TOKEN || 'nest-token-2.testnet',
    vault: process.env.NEXT_PUBLIC_TESTNET_VAULT || 'nest-vault-2.testnet',
    collateralToken:
      process.env.NEXT_PUBLIC_TESTNET_COLLATERAL_TOKEN || 'mocknear-1.testnet',
    finder: process.env.NEXT_PUBLIC_TESTNET_FINDER || 'nest-finder-2.testnet',
    store: process.env.NEXT_PUBLIC_TESTNET_STORE || 'nest-store-2.testnet',
    registry: process.env.NEXT_PUBLIC_TESTNET_REGISTRY || 'nest-registry-2.testnet',
    identifierWhitelist:
      process.env.NEXT_PUBLIC_TESTNET_IDENTIFIER_WHITELIST || 'nest-whitelist-1.testnet',
    slashingLibrary:
      process.env.NEXT_PUBLIC_TESTNET_SLASHING_LIBRARY || 'nest-slashing-2.testnet',
  },
} as const;

export const CURRENCIES: Record<NetworkId, Record<string, CurrencyConfig>> = {
  mainnet: {
    'usdc.near': { symbol: 'USDC', decimals: 6 },
    'wrap.near': { symbol: 'wNEAR', decimals: 24 },
  },
  testnet: {
    '3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af': { symbol: 'USDC', decimals: 6 },
    'wrap.testnet': { symbol: 'wNEAR', decimals: 24 },
    'mocknear-1.testnet': { symbol: 'mockNEAR', decimals: 24 },
  },
};

export const DEFAULT_NETWORK: NetworkId = 'testnet';

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
