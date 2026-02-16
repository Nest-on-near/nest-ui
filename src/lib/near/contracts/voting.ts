import { getContracts, DEFAULT_NETWORK } from '../config';
import { hexToBytes32Array } from '@/lib/bytes32';
import type { DvmPriceRequest, DvmConfig } from './types';

const contracts = getContracts(DEFAULT_NETWORK);
export const DVM_TRUE_PRICE = 1_000_000_000_000_000_000n; // 1e18
export const DVM_FALSE_PRICE = 0n;
const RPC_URL =
  DEFAULT_NETWORK === 'mainnet'
    ? 'https://rpc.mainnet.near.org'
    : 'https://test.rpc.fastnear.com';
const STORAGE_DEPOSIT_YOCTO = '10000000000000000000000'; // 0.01 NEAR

/**
 * Generic NEAR RPC view call helper
 */
async function viewCall<T>(
  contractId: string,
  methodName: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'dontcare',
      method: 'query',
      params: {
        request_type: 'call_function',
        finality: 'final',
        account_id: contractId,
        method_name: methodName,
        args_base64: btoa(JSON.stringify(args)),
      },
    }),
  });
  const json = await response.json();
  if (json.error) throw new Error(json.error.message);
  return JSON.parse(
    new TextDecoder().decode(new Uint8Array(json.result.result))
  );
}

// ==================== View Methods ====================

/**
 * Get the DVM request_id for a disputed assertion.
 * Calls oracle's get_dispute_request(assertion_id).
 * Returns a 32-byte number array, or null if no dispute.
 */
export async function getDvmRequestId(
  assertionId: string
): Promise<number[] | null> {
  return viewCall(contracts.oracle, 'get_dispute_request', {
    assertion_id: hexToBytes32Array(assertionId),
  });
}

/**
 * Get a DVM price request by request_id.
 */
export async function getDvmRequest(
  requestId: number[]
): Promise<DvmPriceRequest | null> {
  return viewCall(contracts.voting, 'get_request', {
    request_id: requestId,
  });
}

/**
 * Get DVM configuration (commit_duration, reveal_duration, min_participation).
 */
export async function getDvmConfig(): Promise<DvmConfig> {
  const [commit_phase_duration, reveal_phase_duration, min_participation_rate] =
    await viewCall<[number, number, number]>(contracts.voting, 'get_config');
  return { commit_phase_duration, reveal_phase_duration, min_participation_rate };
}

/**
 * Get voting token balance for an account (voting power).
 */
export async function getVotingPower(accountId: string): Promise<string> {
  return viewCall(contracts.votingToken, 'ft_balance_of', {
    account_id: accountId,
  });
}

/**
 * Get ft_balance_of for any token contract.
 */
export async function getTokenBalance(
  tokenContractId: string,
  accountId: string
): Promise<string> {
  return viewCall(tokenContractId, 'ft_balance_of', {
    account_id: accountId,
  });
}

type StorageBalance = {
  total: string;
  available: string;
};

/**
 * Get storage balance for a token account.
 * Returns null when account is not registered.
 */
export async function getStorageBalanceOf(
  tokenContractId: string,
  accountId: string
): Promise<StorageBalance | null> {
  return viewCall<StorageBalance | null>(tokenContractId, 'storage_balance_of', {
    account_id: accountId,
  });
}

// ==================== Hash Computation ====================

/**
 * Convert an i128 value to 16 little-endian bytes (matching Rust's i128::to_le_bytes).
 */
function i128ToLeBytes(value: bigint): Uint8Array {
  const bytes = new Uint8Array(16);
  const view = new DataView(bytes.buffer);
  const bigValue = value;
  // Little-endian: low 64 bits first, then high 64 bits
  view.setBigUint64(0, bigValue & 0xFFFFFFFFFFFFFFFFn, true);
  view.setBigUint64(8, (bigValue >> 64n) & 0xFFFFFFFFFFFFFFFFn, true);
  return bytes;
}

/**
 * Compute the vote commitment hash: sha256(price_le_bytes || salt).
 * Must match the Rust contract's compute_vote_hash_static().
 */
export async function computeVoteHash(
  price: bigint | string | number,
  salt: number[]
): Promise<number[]> {
  const priceBytes = i128ToLeBytes(BigInt(price));
  const data = new Uint8Array(16 + 32);
  data.set(priceBytes, 0);
  data.set(new Uint8Array(salt), 16);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer));
}

/**
 * Generate a random 32-byte salt as a number array.
 */
export function generateSalt(): number[] {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array);
}

// ==================== Transaction Builders ====================

/**
 * Commit a vote. Returns args for callFunction.
 */
export function commitVote(
  requestId: number[],
  commitHash: number[],
  stakedAmount: string
) {
  const msg = JSON.stringify({
    action: 'CommitVote',
    request_id: requestId,
    commit_hash: commitHash,
  });

  return {
    contractId: contracts.votingToken,
    method: 'ft_transfer_call',
    args: {
      receiver_id: contracts.voting,
      amount: stakedAmount,
      msg,
    },
    gas: '200000000000000', // 200 TGas
    deposit: '1',
  };
}

/**
 * Reveal a vote. Returns args for callFunction.
 * price: 1 for TRUE, 0 for FALSE
 */
export function revealVote(
  requestId: number[],
  price: bigint | string | number,
  salt: number[]
) {
  // Contract expects `price: i128` as a JSON number (not string).
  // Keep the canonical 1e18 TRUE value while emitting numeric JSON.
  const priceNumeric = Number(BigInt(price).toString());
  return {
    contractId: contracts.voting,
    method: 'reveal_vote',
    args: {
      request_id: requestId,
      price: priceNumeric,
      salt,
    },
    gas: '100000000000000', // 100 TGas
    deposit: '0',
  };
}

/**
 * Advance a request from commit phase to reveal phase.
 * Can be called by anyone after commit phase duration expires.
 */
export function advanceToReveal(requestId: number[]) {
  return {
    contractId: contracts.voting,
    method: 'advance_to_reveal',
    args: { request_id: requestId },
    gas: '100000000000000', // 100 TGas
    deposit: '0',
  };
}

/**
 * Resolve a DVM price request after reveal phase ends.
 * Tallies stake-weighted votes and sets the resolved price.
 * Can be called by anyone after reveal phase expires.
 */
export function resolvePrice(requestId: number[]) {
  return {
    contractId: contracts.voting,
    method: 'resolve_price',
    args: { request_id: requestId },
    gas: '200000000000000', // 200 TGas
    deposit: '0',
  };
}

/**
 * Register storage on a token contract for the signed account.
 */
export function storageDeposit(
  tokenContractId: string,
  accountId: string
) {
  return {
    contractId: tokenContractId,
    method: 'storage_deposit',
    args: {
      account_id: accountId,
      registration_only: true,
    },
    gas: '30000000000000', // 30 TGas
    deposit: STORAGE_DEPOSIT_YOCTO,
  };
}
