'use client';

import { useState, useMemo } from 'react';
import { useNearWallet } from 'near-connect-hooks';
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
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatAccountId, formatDuration, formatTokenAmount, nsToMs } from '@/lib/utils';
import { decodeBytes32 } from '@/lib/bytes32';
import { useToast } from '@/components/ui/toast';
import {
  useDisputedVotes,
  useDvmConfig,
  useVotingPower,
  useStoredCommitments,
  useCommitVote,
  useRevealVote,
  useAdvanceToReveal,
  useResolvePrice,
  useSettleAfterDvm,
  type DisputedVoteItem,
} from '@/hooks/useContracts';
import type { StoredVoteCommitment } from '@/lib/near/contracts';

export default function VotePage() {
  const { signedAccountId } = useNearWallet();

  const { data: disputedVotes, isLoading } = useDisputedVotes();
  const { data: dvmConfig } = useDvmConfig();
  const { data: votingPower } = useVotingPower();
  const { data: storedCommitments } = useStoredCommitments();

  const committedRequestIds = useMemo(() => {
    return new Set((storedCommitments || []).map((c) => c.request_id));
  }, [storedCommitments]);

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

      {/* Disputed Votes */}
      {!isLoading && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Disputed Assertions ({disputedVotes?.length || 0})
          </h2>

          {!disputedVotes || disputedVotes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4" />
                <p className="text-foreground-secondary">
                  No disputed assertions awaiting votes.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {disputedVotes.map((item) => {
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
  const commitMutation = useCommitVote();
  const revealMutation = useRevealVote();
  const advanceMutation = useAdvanceToReveal();
  const resolveMutation = useResolvePrice();
  const settleMutation = useSettleAfterDvm();
  const { addToast } = useToast();

  const { assertion, dvmRequestId, dvmRequestIdHex, dvmRequest } = item;
  const claimText = decodeBytes32(assertion.claim);
  const phase = dvmRequest?.phase || null;

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
    setSelectedVote(vote);
    try {
      await commitMutation.mutateAsync({
        requestId: dvmRequestId,
        requestIdHex: dvmRequestIdHex,
        assertionId: assertion.assertion_id,
        vote,
        votingPower,
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
      await resolveMutation.mutateAsync({ requestId: dvmRequestId });
      addToast({
        type: 'success',
        title: 'Vote resolved',
        message: 'The DVM has reached a decision. You can now settle.',
      });
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
      await settleMutation.mutateAsync({
        assertionId: assertion.assertion_id,
      });
      addToast({
        type: 'success',
        title: 'Assertion settled',
        message: 'Bonds have been distributed based on the vote result.',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Settle failed',
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
                      ({storedCommitment.price === '1' ? 'TRUE' : 'FALSE'})
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
                        ` — ${dvmRequest.resolved_price === 1 ? 'TRUE' : 'FALSE'}`}
                    </span>
                    {!assertion.settled && (
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
                    ` — ${dvmRequest.resolved_price === 1 ? 'TRUE' : 'FALSE'}`}
                </span>
                {!assertion.settled && (
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
