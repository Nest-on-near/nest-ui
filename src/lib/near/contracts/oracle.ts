import { getContracts, DEFAULT_NETWORK } from '../config';
import { hexToBytes32Array } from '@/lib/bytes32';
import type { OracleAssertionState } from './types';

const contracts = getContracts(DEFAULT_NETWORK);
const RPC_URL =
  DEFAULT_NETWORK === 'mainnet'
    ? 'https://rpc.mainnet.near.org'
    : 'https://test.rpc.fastnear.com';

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

/**
 * Build dispute assertion message for ft_transfer_call
 */
function buildDisputeMsg(assertionId: string, disputer: string): string {
  return JSON.stringify({
    action: 'DisputeAssertion',
    assertion_id: hexToBytes32Array(assertionId),
    disputer,
  });
}

/**
 * Dispute an assertion (via ft_transfer_call on bond token).
 * Returns args for callFunction.
 */
export function disputeAssertion(
  assertionId: string,
  disputer: string,
  currency: string,
  bondAmount: string
) {
  return {
    contractId: currency,
    method: 'ft_transfer_call',
    args: {
      receiver_id: contracts.oracle,
      amount: bondAmount,
      msg: buildDisputeMsg(assertionId, disputer),
    },
    gas: '300000000000000', // 300 TGas
    deposit: '1', // 1 yoctoNEAR for ft_transfer
  };
}

/**
 * Settle an assertion (direct call, no token transfer).
 * Returns args for callFunction.
 */
export function settleAssertion(assertionId: string) {
  return {
    contractId: contracts.oracle,
    method: 'settle_assertion',
    args: { assertion_id: hexToBytes32Array(assertionId) },
    gas: '300000000000000', // 300 TGas
    deposit: '0',
  };
}

/**
 * Retry payout for a settlement that is pending after callback failure.
 */
export function retrySettlementPayout(assertionId: string) {
  return {
    contractId: contracts.oracle,
    method: 'retry_settlement_payout',
    args: { assertion_id: hexToBytes32Array(assertionId) },
    gas: '300000000000000', // 300 TGas
    deposit: '0',
  };
}

/**
 * Read full assertion state directly from oracle contract.
 */
export function getOracleAssertion(
  assertionId: string
): Promise<OracleAssertionState | null> {
  return viewCall<OracleAssertionState | null>(contracts.oracle, 'get_assertion', {
    assertion_id: hexToBytes32Array(assertionId),
  });
}
