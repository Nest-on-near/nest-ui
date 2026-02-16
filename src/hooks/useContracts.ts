'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNearWallet } from 'near-connect-hooks';
import {
  getDvmRequestId,
  getDvmRequest,
  getDvmConfig,
  getVotingPower,
  computeVoteHash,
  generateSalt,
  commitVote,
  revealVote,
  advanceToReveal,
  resolvePrice,
  disputeAssertion,
  settleAssertion,
  retrySettlementPayout,
  getOracleAssertion,
  storeCommitment,
  getStoredCommitments,
  getCommitmentForRequest,
  removeCommitment,
  DVM_TRUE_PRICE,
  DVM_FALSE_PRICE,
} from '@/lib/near/contracts';
import type {
  StoredVoteCommitment,
  DvmPriceRequest,
  DvmResolvePriceOutcome,
  OracleAssertionState,
} from '@/lib/near/contracts';
import { fetchAssertions, type IndexerAssertion } from '@/lib/api';
import { bytes32ArrayToHex } from '@/lib/bytes32';

// ==================== Query Keys ====================

export const contractKeys = {
  votingPower: (accountId: string) => ['votingPower', accountId] as const,
  storedCommitments: (accountId: string) =>
    ['storedCommitments', accountId] as const,
  disputedVotes: ['disputed-votes'] as const,
  dvmConfig: ['dvm-config'] as const,
  oracleAssertion: (assertionId: string) =>
    ['oracle-assertion', assertionId] as const,
};

// ==================== Disputed Votes (Indexer + DVM) ====================

/** Combined type: indexer assertion enriched with DVM data */
export interface DisputedVoteItem {
  assertion: IndexerAssertion;
  dvmRequestId: number[] | null;
  dvmRequestIdHex: string | null;
  dvmRequest: DvmPriceRequest | null;
}

/**
 * Fetch disputed assertions from the indexer, then enrich each
 * with DVM request_id and PriceRequest data from the contracts.
 */
export function useDisputedVotes() {
  return useQuery({
    queryKey: contractKeys.disputedVotes,
    queryFn: async (): Promise<DisputedVoteItem[]> => {
      const { assertions } = await fetchAssertions({ per_page: 100 });
      const votingAssertions = assertions.filter(
        (a) =>
          (a.status === 'disputed' || a.status === 'pending_settlement') &&
          a.disputer !== null
      );

      const items = await Promise.all(
        votingAssertions.map(async (assertion) => {
          try {
            const dvmRequestId = await getDvmRequestId(
              assertion.assertion_id
            );
            let dvmRequest: DvmPriceRequest | null = null;
            let dvmRequestIdHex: string | null = null;

            if (dvmRequestId) {
              dvmRequestIdHex = bytes32ArrayToHex(dvmRequestId);
              dvmRequest = await getDvmRequest(dvmRequestId);
            }

            return { assertion, dvmRequestId, dvmRequestIdHex, dvmRequest };
          } catch {
            // If DVM query fails, still show the assertion
            return {
              assertion,
              dvmRequestId: null,
              dvmRequestIdHex: null,
              dvmRequest: null,
            };
          }
        })
      );

      return items;
    },
    refetchInterval: 15000,
    staleTime: 10000,
  });
}

/**
 * Fetch DVM configuration (phase durations).
 */
export function useDvmConfig() {
  return useQuery({
    queryKey: contractKeys.dvmConfig,
    queryFn: getDvmConfig,
    staleTime: 300000,
  });
}

// ==================== Voting Power ====================

export function useVotingPower() {
  const { signedAccountId } = useNearWallet();

  return useQuery({
    queryKey: contractKeys.votingPower(signedAccountId || ''),
    queryFn: () => getVotingPower(signedAccountId!),
    enabled: !!signedAccountId,
    staleTime: 60000,
  });
}

// ==================== Stored Commitments ====================

export function useStoredCommitments() {
  const { signedAccountId } = useNearWallet();

  return useQuery({
    queryKey: contractKeys.storedCommitments(signedAccountId || ''),
    queryFn: () => getStoredCommitments(signedAccountId!),
    enabled: !!signedAccountId,
  });
}

// ==================== Dispute & Settle ====================

export function useDisputeAssertion() {
  const { signedAccountId, callFunction } = useNearWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assertionId,
      currency,
      bondAmount,
    }: {
      assertionId: string;
      currency: string;
      bondAmount: string;
    }) => {
      if (!signedAccountId) throw new Error('Wallet not connected');

      const txArgs = disputeAssertion(
        assertionId,
        signedAccountId,
        currency,
        bondAmount
      );

      return callFunction(txArgs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assertions'] });
      queryClient.invalidateQueries({ queryKey: contractKeys.disputedVotes });
    },
  });
}

export function useSettleAssertion() {
  const { callFunction } = useNearWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assertionId }: { assertionId: string }) => {
      const txArgs = settleAssertion(assertionId);
      return callFunction(txArgs);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assertions'] });
      queryClient.invalidateQueries({
        queryKey: contractKeys.oracleAssertion(variables.assertionId),
      });
    },
  });
}

export function useOracleAssertion(assertionId: string) {
  return useQuery({
    queryKey: contractKeys.oracleAssertion(assertionId),
    queryFn: () => getOracleAssertion(assertionId),
    enabled: !!assertionId,
    refetchInterval: 10000,
    staleTime: 5000,
  });
}

export function useRetrySettlementPayout() {
  const { callFunction } = useNearWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assertionId }: { assertionId: string }) => {
      const txArgs = retrySettlementPayout(assertionId);
      return callFunction(txArgs);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assertions'] });
      queryClient.invalidateQueries({
        queryKey: contractKeys.disputedVotes,
      });
      queryClient.invalidateQueries({
        queryKey: contractKeys.oracleAssertion(variables.assertionId),
      });
    },
  });
}

// ==================== DVM Voting ====================

/**
 * Commit a vote on a DVM price request.
 * Generates salt, computes SHA-256 hash, sends commit tx, stores commitment locally.
 */
export function useCommitVote() {
  const { signedAccountId, callFunction } = useNearWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      requestIdHex,
      assertionId,
      vote,
      stakeAmountRaw,
    }: {
      requestId: number[];
      requestIdHex: string;
      assertionId: string;
      vote: 'true' | 'false';
      stakeAmountRaw: string;
    }) => {
      if (!signedAccountId) throw new Error('Wallet not connected');
      if (!stakeAmountRaw || BigInt(stakeAmountRaw) <= 0n) {
        throw new Error('Stake amount must be greater than 0');
      }

      const price = vote === 'true' ? DVM_TRUE_PRICE : DVM_FALSE_PRICE;
      const salt = generateSalt();
      const commitHash = await computeVoteHash(price, salt);

      // Store commitment BEFORE sending tx so the salt is never lost
      // (if the tx fails, we keep it — user can retry; if we stored after,
      // a network error after a successful tx would lose the salt forever)
      const commitment: StoredVoteCommitment = {
        request_id: requestIdHex,
        assertion_id: assertionId,
        price: price.toString(),
        salt,
        commit_hash: commitHash,
        committed_at: Date.now(),
      };
      storeCommitment(signedAccountId, commitment);

      const txArgs = commitVote(requestId, commitHash, stakeAmountRaw);
      await callFunction(txArgs);

      return commitment;
    },
    onSuccess: () => {
      if (signedAccountId) {
        queryClient.invalidateQueries({
          queryKey: contractKeys.storedCommitments(signedAccountId),
        });
        queryClient.invalidateQueries({
          queryKey: contractKeys.disputedVotes,
        });
      }
    },
  });
}

/**
 * Reveal a previously committed vote.
 */
export function useRevealVote() {
  const { signedAccountId, callFunction } = useNearWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      requestIdHex,
    }: {
      requestId: number[];
      requestIdHex: string;
    }) => {
      if (!signedAccountId) throw new Error('Wallet not connected');

      const commitment = getCommitmentForRequest(signedAccountId, requestIdHex);

      if (!commitment) {
        throw new Error('No stored commitment found for this vote');
      }

      const price = BigInt(commitment.price);
      const txArgs = revealVote(requestId, price, commitment.salt);
      await callFunction(txArgs);

      removeCommitment(signedAccountId, requestIdHex);
    },
    onSuccess: () => {
      if (signedAccountId) {
        queryClient.invalidateQueries({
          queryKey: contractKeys.storedCommitments(signedAccountId),
        });
        queryClient.invalidateQueries({
          queryKey: contractKeys.disputedVotes,
        });
      }
    },
  });
}

/**
 * Advance a DVM request from commit to reveal phase.
 */
export function useAdvanceToReveal() {
  const { callFunction } = useNearWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId }: { requestId: number[] }) => {
      const txArgs = advanceToReveal(requestId);
      return callFunction(txArgs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: contractKeys.disputedVotes,
      });
    },
  });
}

/**
 * Resolve a DVM price request after reveal phase ends.
 */
export function useResolvePrice() {
  const { callFunction } = useNearWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId }: { requestId: number[] }) => {
      const txArgs = resolvePrice(requestId);
      await callFunction(txArgs);
      const updatedRequest = await getDvmRequest(requestId).catch(() => null);
      if (!updatedRequest) return 'Unknown' as DvmResolvePriceOutcome;
      if (updatedRequest.phase === 'Resolved') {
        return 'Resolved' as DvmResolvePriceOutcome;
      }
      if (updatedRequest.emergency_required) {
        return 'EmergencyRequired' as DvmResolvePriceOutcome;
      }
      if (updatedRequest.phase === 'Reveal') {
        return 'RevealExtended' as DvmResolvePriceOutcome;
      }
      return 'Unknown' as DvmResolvePriceOutcome;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: contractKeys.disputedVotes,
      });
    },
  });
}

/**
 * Settle assertion after DVM resolution.
 * Calls oracle's settle_assertion which reads the DVM result.
 */
export function useSettleAfterDvm() {
  const { callFunction } = useNearWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assertionId }: { assertionId: string }) => {
      const txArgs = settleAssertion(assertionId);
      await callFunction(txArgs);
      const updatedAssertion: OracleAssertionState | null =
        await getOracleAssertion(assertionId).catch(() => null);
      return {
        settlementPending: !!updatedAssertion?.settlement_pending,
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assertions'] });
      queryClient.invalidateQueries({
        queryKey: contractKeys.disputedVotes,
      });
      queryClient.invalidateQueries({
        queryKey: contractKeys.oracleAssertion(variables.assertionId),
      });
    },
  });
}
