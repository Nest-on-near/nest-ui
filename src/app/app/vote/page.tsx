'use client';

import { Suspense, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useNearWallet } from 'near-connect-hooks';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  Vote,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FastForward,
  Gavel,
  Scale,
  RotateCcw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  formatAccountId,
  formatDuration,
  formatTokenAmount,
  nsToMs,
  parseTokenAmount,
} from '@/lib/utils';
import { decodeClaimForDisplay } from '@/lib/bytes32';
import { bytes32ArrayToHex, hexToBytes32Array } from '@/lib/bytes32';
import { useToast } from '@/components/ui/toast';
import { DEFAULT_NETWORK, getContracts, getCurrencyConfig } from '@/lib/near/config';
import { getDvmRequest, getDvmRequestId, getOracleAssertion } from '@/lib/near/contracts';
import {
  useDisputedVotes,
  useDvmConfig,
  useVotingPower,
  useTokenBalance,
  useStorageRegistered,
  useRegisterTokenStorage,
  useDepositCollateralToVault,
  useStoredCommitments,
  useCommitVote,
  useRevealVote,
  useAdvanceToReveal,
  useResolvePrice,
  useSettleAfterDvm,
  useRetrySettlementPayout,
  type DisputedVoteItem,
} from '@/hooks/useContracts';
import type { StoredVoteCommitment } from '@/lib/near/contracts';
import type { IndexerAssertion } from '@/lib/api';

const TRUE_PRICE_THRESHOLD = 1_000_000_000_000_000_000n;

function normalizeHexFilter(value: string | null): string | null {
  if (!value) return null;
  return value.trim().toLowerCase().replace(/^0x/, '');
}

function isTruePrice(price: string | number | null | undefined): boolean {
  if (price === null || price === undefined) return false;
  try {
    return BigInt(String(price)) >= TRUE_PRICE_THRESHOLD;
  } catch {
    return false;
  }
}

function isHex32(value: string | null): value is string {
  if (!value) return false;
  const clean = value.replace(/^0x/, '');
  return /^[0-9a-f]{64}$/i.test(clean);
}

export default function VotePage() {
  return (
    <Suspense fallback={<div className="text-sm text-foreground-muted">Loading vote context...</div>}>
      <VotePageContent />
    </Suspense>
  );
}

function VotePageContent() {
  const { signedAccountId } = useNearWallet();
  const walletDisconnected = !signedAccountId;
  const searchParams = useSearchParams();
  const contracts = getContracts(DEFAULT_NETWORK);
  const collateralConfig = getCurrencyConfig(contracts.collateralToken, DEFAULT_NETWORK);
  const collateralDecimals = collateralConfig?.decimals ?? 24;
  const collateralSymbol = collateralConfig?.symbol ?? 'Collateral';
  const [depositAmount, setDepositAmount] = useState('');
  const { addToast } = useToast();

  const { data: disputedVotes, isLoading } = useDisputedVotes();
  const { data: dvmConfig } = useDvmConfig();
  const { data: votingPower } = useVotingPower();
  const { data: collateralBalance } = useTokenBalance(contracts.collateralToken);
  const { data: nestStorageRegistered } = useStorageRegistered(contracts.votingToken);
  const { data: collateralStorageRegistered } = useStorageRegistered(contracts.collateralToken);
  const registerStorageMutation = useRegisterTokenStorage();
  const depositCollateralMutation = useDepositCollateralToVault();
  const { data: storedCommitments } = useStoredCommitments();

  const committedRequestIds = useMemo(() => {
    return new Set((storedCommitments || []).map((c) => c.request_id));
  }, [storedCommitments]);

  const assertionFilter = normalizeHexFilter(searchParams.get('assertion_id'));
  const requestFilter = normalizeHexFilter(searchParams.get('request_id'));

  const visibleVotes = useMemo(() => {
    const source = disputedVotes || [];
    if (!assertionFilter && !requestFilter) {
      return source;
    }
    return source.filter((item) => {
      const assertionMatch = assertionFilter
        ? normalizeHexFilter(item.assertion.assertion_id) === assertionFilter
        : true;
      const requestMatch = requestFilter
        ? normalizeHexFilter(item.dvmRequestIdHex ?? null) === requestFilter
        : true;
      return assertionMatch && requestMatch;
    });
  }, [disputedVotes, assertionFilter, requestFilter]);

  const { data: deepLinkedFallbackItem, isLoading: isFallbackLoading } = useQuery({
    queryKey: ['vote-deep-link-fallback', assertionFilter, requestFilter],
    enabled: !!assertionFilter && visibleVotes.length === 0 && isHex32(assertionFilter),
    queryFn: async (): Promise<DisputedVoteItem | null> => {
      if (!assertionFilter || !isHex32(assertionFilter)) {
        return null;
      }

      const assertion = await getOracleAssertion(assertionFilter);
      if (!assertion || !assertion.disputer) {
        return null;
      }

      const requestId = requestFilter && isHex32(requestFilter)
        ? hexToBytes32Array(requestFilter)
        : await getDvmRequestId(assertionFilter);

      const requestIdHex = requestId ? bytes32ArrayToHex(requestId).replace(/^0x/, '') : null;
      const request = requestId ? await getDvmRequest(requestId).catch(() => null) : null;

      if (requestFilter && requestIdHex && requestIdHex !== requestFilter) {
        return null;
      }

      const synthesizedAssertion: IndexerAssertion = {
        assertion_id: assertionFilter,
        domain_id: '',
        claim: typeof assertion.claim === 'string' ? assertion.claim : `0x${assertionFilter}`,
        asserter: assertion.asserter ?? 'unknown',
        callback_recipient: assertion.callback_recipient ?? null,
        escalation_manager: assertion.escalation_manager_settings?.escalation_manager ?? null,
        caller: assertion.escalation_manager_settings?.asserting_caller ?? 'unknown',
        expiration_time_ns: String(assertion.expiration_time_ns ?? '0'),
        currency: assertion.currency ?? contracts.collateralToken,
        bond: String(assertion.bond ?? '0'),
        identifier: '',
        disputer: assertion.disputer ?? null,
        settled: Boolean(assertion.settled),
        settlement_pending: Boolean(assertion.settlement_pending),
        settlement_in_flight: Boolean(assertion.settlement_in_flight),
        settlement_resolution: Boolean(assertion.settlement_resolution),
        bond_recipient: null,
        status: assertion.settled
          ? assertion.settlement_resolution ? 'settled_true' : 'settled_false'
          : assertion.disputer ? 'disputed' : 'active',
        created_at: Date.now(),
        updated_at: Date.now(),
        block_height: 0,
        transaction_id: '',
      };

      return {
        assertion: synthesizedAssertion,
        dvmRequestId: requestId,
        dvmRequestIdHex: requestIdHex,
        dvmRequest: request,
      };
    },
    staleTime: 10000,
    refetchInterval: 15000,
  });

  const renderedVotes = useMemo(() => {
    if (visibleVotes.length > 0) return visibleVotes;
    return deepLinkedFallbackItem ? [deepLinkedFallbackItem] : [];
  }, [visibleVotes, deepLinkedFallbackItem]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">DVM Voting</h1>
        <p className="text-foreground-secondary mt-1">
          Vote on disputed assertions to help resolve them
        </p>
      </div>

      {/* Voting Power */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-light">
              <Vote className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-foreground-muted">Your Voting Power</p>
              <p className="text-2xl font-bold text-foreground">
                {signedAccountId && votingPower
                  ? `${formatTokenAmount(votingPower, 24)} NEST`
                  : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vault Deposit */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <p className="text-sm text-foreground-muted">Get NEST from Vault</p>
            <p className="text-sm text-foreground-secondary mt-1">
              Register storage once, then deposit {collateralSymbol} into the vault to mint NEST 1:1.
            </p>
          </div>
          <div className="text-xs text-foreground-muted space-y-1">
            <p>Collateral token: <span className="font-mono">{contracts.collateralToken}</span></p>
            <p>Vault: <span className="font-mono">{contracts.vault}</span></p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-foreground-muted">Your {collateralSymbol}: </span>
              <span className="font-medium">
                {signedAccountId && collateralBalance
                  ? formatTokenAmount(collateralBalance, collateralDecimals)
                  : '—'}
              </span>
            </div>
            <div>
              <span className="text-foreground-muted">NEST storage: </span>
              <Badge variant={nestStorageRegistered ? 'success' : 'warning'}>
                {nestStorageRegistered ? 'Registered' : 'Missing'}
              </Badge>
            </div>
            <div>
              <span className="text-foreground-muted">{collateralSymbol} storage: </span>
              <Badge variant={collateralStorageRegistered ? 'success' : 'warning'}>
                {collateralStorageRegistered ? 'Registered' : 'Missing'}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={
                walletDisconnected || !!nestStorageRegistered || registerStorageMutation.isPending
              }
              loading={registerStorageMutation.isPending}
              onClick={async () => {
                try {
                  await registerStorageMutation.mutateAsync({ tokenContractId: contracts.votingToken });
                  addToast({
                    type: 'success',
                    title: 'NEST storage registered',
                    message: 'Your account is ready to receive minted NEST.',
                  });
                } catch (err) {
                  addToast({
                    type: 'error',
                    title: 'Storage registration failed',
                    message: (err as Error).message,
                  });
                }
              }}
            >
              Register NEST Storage
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={
                walletDisconnected ||
                !!collateralStorageRegistered ||
                registerStorageMutation.isPending
              }
              loading={registerStorageMutation.isPending}
              onClick={async () => {
                try {
                  await registerStorageMutation.mutateAsync({
                    tokenContractId: contracts.collateralToken,
                  });
                  addToast({
                    type: 'success',
                    title: `${collateralSymbol} storage registered`,
                    message: 'Your account can now hold and transfer collateral.',
                  });
                } catch (err) {
                  addToast({
                    type: 'error',
                    title: 'Storage registration failed',
                    message: (err as Error).message,
                  });
                }
              }}
            >
              Register {collateralSymbol} Storage
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <input
              className="h-9 rounded-md border border-border px-3 text-sm bg-background min-w-[220px]"
              type="number"
              min="0"
              step="0.0001"
              placeholder={`Deposit ${collateralSymbol} amount`}
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              disabled={walletDisconnected || depositCollateralMutation.isPending}
            />
            <Button
              size="sm"
              disabled={
                walletDisconnected ||
                depositCollateralMutation.isPending ||
                !nestStorageRegistered ||
                !collateralStorageRegistered
              }
              loading={depositCollateralMutation.isPending}
              onClick={async () => {
                try {
                  const amountRaw = parseTokenAmount(depositAmount, collateralDecimals);
                  if (BigInt(amountRaw) <= 0n) {
                    throw new Error('Amount must be greater than 0');
                  }
                  await depositCollateralMutation.mutateAsync({ amountRaw });
                  setDepositAmount('');
                  addToast({
                    type: 'success',
                    title: 'Collateral deposited',
                    message: 'NEST mint transaction submitted via vault.',
                  });
                } catch (err) {
                  addToast({
                    type: 'error',
                    title: 'Deposit failed',
                    message: (err as Error).message,
                  });
                }
              }}
            >
              Deposit to Vault
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Not Connected Warning */}
      {!signedAccountId && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-warning-light border border-amber-200">
          <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800">Wallet not connected</p>
            <p className="text-sm text-amber-700 mt-1">
              Connect your wallet to view your voting power and participate in voting.
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto text-primary mb-4 animate-spin" />
            <p className="text-foreground-secondary">Loading disputed assertions...</p>
          </CardContent>
        </Card>
      )}

      {(assertionFilter || requestFilter) && (
        <Card>
          <CardContent className="p-4 text-sm text-foreground-secondary">
            Showing filtered vote context from deep link.
            {deepLinkedFallbackItem && (
              <p className="mt-2 text-xs text-amber-700">
                Indexer did not return this dispute yet. Showing on-chain fallback data.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Disputed Votes */}
      {!isLoading && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Disputed Assertions ({renderedVotes.length})
          </h2>

          {renderedVotes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                {isFallbackLoading ? (
                  <Loader2 className="h-12 w-12 mx-auto text-primary mb-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4" />
                )}
                <p className="text-foreground-secondary">
                  {isFallbackLoading
                    ? 'Looking up linked dispute on-chain...'
                    : 'No disputed assertions match this filter.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {renderedVotes.map((item) => {
                const isCommitted = item.dvmRequestIdHex
                  ? committedRequestIds.has(item.dvmRequestIdHex)
                  : false;
                const storedCommitment =
                  item.dvmRequestIdHex
                    ? (storedCommitments || []).find(
                        (c) => c.request_id === item.dvmRequestIdHex
                      )
                    : undefined;

                return (
                  <VoteCard
                    key={item.assertion.assertion_id}
                    item={item}
                    dvmConfig={dvmConfig}
                    isCommitted={isCommitted}
                    storedCommitment={storedCommitment}
                    votingPower={votingPower || '0'}
                    disabled={!signedAccountId}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Committed Votes Awaiting Reveal */}
      {storedCommitments && storedCommitments.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Committed Votes (Pending Reveal)
          </h2>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <EyeOff className="h-5 w-5 text-foreground-muted mt-0.5" />
                <div>
                  <p className="text-foreground">
                    You have {storedCommitments.length} committed vote(s) stored
                    locally.
                  </p>
                  <p className="text-sm text-foreground-secondary mt-1">
                    Make sure to reveal your votes during the reveal phase. Your
                    vote data is stored in this browser&apos;s localStorage.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ==================== VoteCard ====================

interface VoteCardProps {
  item: DisputedVoteItem;
  dvmConfig: { commit_phase_duration: number; reveal_phase_duration: number } | undefined;
  isCommitted: boolean;
  storedCommitment: StoredVoteCommitment | undefined;
  votingPower: string;
  disabled: boolean;
}

function VoteCard({
  item,
  dvmConfig,
  isCommitted,
  storedCommitment,
  votingPower,
  disabled,
}: VoteCardProps) {
  const [selectedVote, setSelectedVote] = useState<'true' | 'false' | null>(
    null
  );
  const [stakeAmount, setStakeAmount] = useState('');
  const commitMutation = useCommitVote();
  const revealMutation = useRevealVote();
  const advanceMutation = useAdvanceToReveal();
  const resolveMutation = useResolvePrice();
  const settleMutation = useSettleAfterDvm();
  const retrySettlementMutation = useRetrySettlementPayout();
  const { addToast } = useToast();

  const { assertion, dvmRequestId, dvmRequestIdHex, dvmRequest } = item;
  const claimText = decodeClaimForDisplay(assertion.claim);
  const phase = dvmRequest?.phase || null;
  const settlementPending = assertion.settlement_pending;
  const settlementInFlight = assertion.settlement_in_flight;
  const canRetrySettlement = settlementPending && !settlementInFlight;

  // Compute phase timing
  const now = Date.now();
  let phaseLabel = 'Pending DVM';
  let phaseTimeRemaining: string | null = null;
  let commitExpired = false;
  let revealExpired = false;

  if (dvmRequest && dvmConfig) {
    if (phase === 'Commit') {
      const commitEndNs =
        dvmRequest.commit_start_time + dvmConfig.commit_phase_duration;
      const commitEndMs = nsToMs(commitEndNs);
      if (now < commitEndMs) {
        phaseLabel = 'Commit Phase';
        phaseTimeRemaining = formatDuration(commitEndMs - now);
      } else {
        phaseLabel = 'Commit Ended';
        commitExpired = true;
      }
    } else if (phase === 'Reveal') {
      const revealEndNs =
        dvmRequest.reveal_start_time + dvmConfig.reveal_phase_duration;
      const revealEndMs = nsToMs(revealEndNs);
      if (now < revealEndMs) {
        phaseLabel = 'Reveal Phase';
        phaseTimeRemaining = formatDuration(revealEndMs - now);
      } else {
        phaseLabel = 'Reveal Ended';
        revealExpired = true;
      }
    } else if (phase === 'Resolved') {
      phaseLabel = 'Resolved';
    }
  }

  const handleCommit = async (vote: 'true' | 'false') => {
    if (!dvmRequestId || !dvmRequestIdHex) return;
    if (!stakeAmount.trim()) {
      addToast({
        type: 'error',
        title: 'Stake required',
        message: 'Enter stake amount in NEST.',
      });
      return;
    }

    let stakeAmountRaw: string;
    try {
      stakeAmountRaw = parseTokenAmount(stakeAmount, 24);
      if (BigInt(stakeAmountRaw) <= 0n) throw new Error();
      if (BigInt(stakeAmountRaw) > BigInt(votingPower)) {
        addToast({
          type: 'error',
          title: 'Insufficient voting power',
          message: 'Stake amount exceeds your voting token balance.',
        });
        return;
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Invalid stake amount',
        message: 'Enter a valid numeric stake amount.',
      });
      return;
    }

    setSelectedVote(vote);
    try {
      await commitMutation.mutateAsync({
        requestId: dvmRequestId,
        requestIdHex: dvmRequestIdHex,
        assertionId: assertion.assertion_id,
        vote,
        stakeAmountRaw,
      });
      addToast({
        type: 'success',
        title: 'Vote committed',
        message: 'Remember to reveal during the reveal phase.',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Commit failed',
        message: (err as Error).message,
      });
      setSelectedVote(null);
    }
  };

  const handleReveal = async () => {
    if (!dvmRequestId || !dvmRequestIdHex) return;
    try {
      await revealMutation.mutateAsync({
        requestId: dvmRequestId,
        requestIdHex: dvmRequestIdHex,
      });
      addToast({
        type: 'success',
        title: 'Vote revealed',
        message: 'Your vote has been counted.',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Reveal failed',
        message: (err as Error).message,
      });
    }
  };

  const handleAdvanceToReveal = async () => {
    if (!dvmRequestId) return;
    try {
      await advanceMutation.mutateAsync({ requestId: dvmRequestId });
      addToast({
        type: 'success',
        title: 'Advanced to reveal phase',
        message: 'You can now reveal your vote.',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Advance failed',
        message: (err as Error).message,
      });
    }
  };

  const handleResolve = async () => {
    if (!dvmRequestId) return;
    try {
      const outcome = await resolveMutation.mutateAsync({ requestId: dvmRequestId });
      if (outcome === 'Resolved') {
        addToast({
          type: 'success',
          title: 'Vote resolved',
          message: 'The DVM has reached a decision. You can now settle.',
        });
      } else if (outcome === 'RevealExtended') {
        addToast({
          type: 'warning',
          title: 'Reveal phase extended',
          message: 'Participation was low, so reveal was extended.',
        });
      } else if (outcome === 'EmergencyRequired') {
        addToast({
          type: 'warning',
          title: 'Emergency resolution required',
          message: 'Participation remained low. Use emergency resolve path.',
        });
      } else {
        addToast({
          type: 'success',
          title: 'Resolve transaction submitted',
          message: 'State updated. Refreshing request status.',
        });
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Resolve failed',
        message: (err as Error).message,
      });
    }
  };

  const handleSettle = async () => {
    try {
      const result = await settleMutation.mutateAsync({
        assertionId: assertion.assertion_id,
      });
      if (result.settlementPending) {
        addToast({
          type: 'success',
          title: 'Settlement initiated',
          message: 'Payout callback is in progress. Final settled state will update shortly.',
        });
      } else {
        addToast({
          type: 'success',
          title: 'Assertion settled',
          message: 'Assertion appears finalized on-chain.',
        });
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Settle failed',
        message: (err as Error).message,
      });
    }
  };

  const handleRetrySettlement = async () => {
    try {
      await retrySettlementMutation.mutateAsync({
        assertionId: assertion.assertion_id,
      });
      addToast({
        type: 'success',
        title: 'Settlement retry submitted',
        message: 'Retrying settlement payout callback.',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Retry failed',
        message: (err as Error).message,
      });
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Claim */}
          <div>
            <p className="text-sm text-foreground-muted mb-1">
              Is this assertion TRUE?
            </p>
            <p className="text-foreground font-medium">
              &ldquo;{claimText || 'Unable to decode claim'}&rdquo;
            </p>
          </div>

          {/* Details */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-foreground-muted">Asserter: </span>
              <span className="font-mono text-foreground-secondary">
                {formatAccountId(assertion.asserter)}
              </span>
            </div>
            {assertion.disputer && (
              <div>
                <span className="text-foreground-muted">Disputer: </span>
                <span className="font-mono text-foreground-secondary">
                  {formatAccountId(assertion.disputer)}
                </span>
              </div>
            )}
          </div>

          {/* Phase Badge */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-foreground-muted" />
            <Badge
              variant={
                phase === 'Commit'
                  ? 'warning'
                  : phase === 'Reveal'
                    ? 'default'
                    : phase === 'Resolved'
                      ? 'success'
                      : 'muted'
              }
            >
              {phaseLabel}
            </Badge>
            {phaseTimeRemaining && (
              <span className="text-sm text-foreground-muted">
                {phaseTimeRemaining} remaining
              </span>
            )}
          </div>

          {/* Vote Status / Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2 border-t border-border">
            {!dvmRequestId ? (
              <span className="text-sm text-foreground-muted">
                DVM request not found for this dispute
              </span>
            ) : isCommitted ? (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="success" className="gap-1.5">
                  <EyeOff className="h-3 w-3" />
                  Committed
                  {storedCommitment && (
                    <span className="ml-1">
                      ({isTruePrice(storedCommitment.price) ? 'TRUE' : 'FALSE'})
                    </span>
                  )}
                </Badge>
                {phase === 'Reveal' && !revealExpired ? (
                  <Button
                    size="sm"
                    onClick={handleReveal}
                    disabled={disabled || revealMutation.isPending}
                    loading={revealMutation.isPending}
                  >
                    <Eye className="h-4 w-4 mr-1.5" />
                    Reveal Vote
                  </Button>
                ) : commitExpired ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAdvanceToReveal}
                    disabled={disabled || advanceMutation.isPending}
                    loading={advanceMutation.isPending}
                  >
                    <FastForward className="h-4 w-4 mr-1.5" />
                    Advance to Reveal
                  </Button>
                ) : revealExpired ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleResolve}
                    disabled={disabled || resolveMutation.isPending}
                    loading={resolveMutation.isPending}
                  >
                    <Gavel className="h-4 w-4 mr-1.5" />
                    Resolve Vote
                  </Button>
                ) : phase === 'Commit' ? (
                  <span className="text-foreground-muted">
                    Awaiting reveal phase
                  </span>
                ) : phase === 'Resolved' ? (
                  <div className="flex items-center gap-2">
                    <span className="text-foreground-muted">
                      Vote resolved
                      {dvmRequest?.resolved_price !== null &&
                        dvmRequest?.resolved_price !== undefined &&
                        ` — ${isTruePrice(dvmRequest.resolved_price) ? 'TRUE' : 'FALSE'}`}
                    </span>
                    {settlementPending ? (
                      <>
                        <span className="text-xs text-foreground-muted">
                          {settlementInFlight
                            ? 'Settlement pending payout callback'
                            : 'Settlement pending (retry available)'}
                        </span>
                        {canRetrySettlement && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleRetrySettlement}
                            disabled={disabled || retrySettlementMutation.isPending}
                            loading={retrySettlementMutation.isPending}
                          >
                            <RotateCcw className="h-4 w-4 mr-1.5" />
                            Retry Settlement
                          </Button>
                        )}
                      </>
                    ) : !assertion.settled && (
                      <Button
                        size="sm"
                        onClick={handleSettle}
                        disabled={disabled || settleMutation.isPending}
                        loading={settleMutation.isPending}
                      >
                        <Scale className="h-4 w-4 mr-1.5" />
                        Settle
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>
            ) : phase === 'Commit' && !commitExpired ? (
              <div className="flex flex-col gap-3 w-full">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-foreground-muted">
                    Stake (NEST):
                  </span>
                  <input
                    className="h-9 rounded-md border border-border px-3 text-sm bg-background"
                    type="number"
                    min="0"
                    step="0.0001"
                    placeholder="0.0"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    disabled={disabled || commitMutation.isPending}
                  />
                  <span className="text-xs text-foreground-muted">
                    Balance: {formatTokenAmount(votingPower, 24)} NEST
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-foreground-muted">
                    Your vote:
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={
                        selectedVote === 'true' ? 'primary' : 'outline'
                      }
                      onClick={() => handleCommit('true')}
                      disabled={disabled || commitMutation.isPending}
                      loading={
                        commitMutation.isPending && selectedVote === 'true'
                      }
                    >
                      Vote TRUE
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        selectedVote === 'false' ? 'destructive' : 'outline'
                      }
                      onClick={() => handleCommit('false')}
                      disabled={disabled || commitMutation.isPending}
                      loading={
                        commitMutation.isPending && selectedVote === 'false'
                      }
                    >
                      Vote FALSE
                    </Button>
                  </div>
                </div>
              </div>
            ) : commitExpired ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground-muted">
                  Commit phase ended.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAdvanceToReveal}
                  disabled={disabled || advanceMutation.isPending}
                  loading={advanceMutation.isPending}
                >
                  <FastForward className="h-4 w-4 mr-1.5" />
                  Advance to Reveal
                </Button>
              </div>
            ) : phase === 'Reveal' && !revealExpired ? (
              <span className="text-sm text-foreground-muted">
                No commitment found — cannot reveal
              </span>
            ) : revealExpired ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground-muted">
                  Reveal phase ended.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResolve}
                  disabled={disabled || resolveMutation.isPending}
                  loading={resolveMutation.isPending}
                >
                  <Gavel className="h-4 w-4 mr-1.5" />
                  Resolve Vote
                </Button>
              </div>
            ) : phase === 'Resolved' ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground-muted">
                  Vote resolved
                  {dvmRequest?.resolved_price !== null &&
                    dvmRequest?.resolved_price !== undefined &&
                    ` — ${isTruePrice(dvmRequest.resolved_price) ? 'TRUE' : 'FALSE'}`}
                </span>
                {!assertion.settled && (
                  settlementPending ? (
                    <>
                      <span className="text-xs text-foreground-muted">
                        {settlementInFlight
                          ? 'Settlement pending payout callback'
                          : 'Settlement pending (retry available)'}
                      </span>
                      {canRetrySettlement && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleRetrySettlement}
                          disabled={disabled || retrySettlementMutation.isPending}
                          loading={retrySettlementMutation.isPending}
                        >
                          <RotateCcw className="h-4 w-4 mr-1.5" />
                          Retry Settlement
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleSettle}
                      disabled={disabled || settleMutation.isPending}
                      loading={settleMutation.isPending}
                    >
                      <Scale className="h-4 w-4 mr-1.5" />
                      Settle
                    </Button>
                  )
                )}
              </div>
            ) : (
              <span className="text-sm text-foreground-muted">
                Voting not active
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
