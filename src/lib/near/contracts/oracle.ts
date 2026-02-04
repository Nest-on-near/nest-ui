import { getContracts, DEFAULT_NETWORK } from '../config';
import { hexToBytes32Array } from '@/lib/bytes32';

const contracts = getContracts(DEFAULT_NETWORK);

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
