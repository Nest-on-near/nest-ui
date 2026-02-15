import { CurrencyConfig } from '@/types';

export type NetworkId = 'mainnet' | 'testnet';

export const CONTRACTS = {
  mainnet: {
    oracle: 'nest-oracle.near',
    voting: 'nest-voting.near',
    votingToken: 'nest-token.near',
    finder: 'nest-finder.near',
    store: 'nest-store.near',
    registry: 'nest-registry.near',
    identifierWhitelist: 'nest-identifiers.near',
    slashingLibrary: 'nest-slashing.near',
  },
  testnet: {
    oracle: 'oracle7-260215a.testnet',
    voting: 'nest-voting-3.testnet',
    votingToken: 'nest-token-1.testnet',
    finder: 'nest-finder-1.testnet',
    store: 'nest-store-1.testnet',
    registry: 'nest-registry-1.testnet',
    identifierWhitelist: 'nest-identifiers-1.testnet',
    slashingLibrary: 'nest-slashing-1.testnet',
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
