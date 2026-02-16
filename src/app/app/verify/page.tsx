'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNearWallet } from 'near-connect-hooks';
import {
  Search,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RotateCcw,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AssertionStatus } from '@/types';
import { formatAccountId, formatRelativeTime, formatTokenAmount, nsToMs } from '@/lib/utils';
import { decodeBytes32, decodeClaimForDisplay } from '@/lib/bytes32';
import { getCurrencies, DEFAULT_NETWORK } from '@/lib/near/config';
import { fetchAssertions, IndexerAssertion } from '@/lib/api';
import {
  useDisputeAssertion,
  useSettleAssertion,
  useRetrySettlementPayout,
} from '@/hooks/useContracts';
import { DisputeDialog } from '@/components/dispute-dialog';
import { useToast } from '@/components/ui/toast';

export default function VerifyPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssertionStatus | 'all'>('all');
  const [tokenFilter, setTokenFilter] = useState('all');

  const currencies = getCurrencies(DEFAULT_NETWORK);

  // Fetch assertions from the indexer
  const { data, isLoading, error } = useQuery({
    queryKey: ['assertions', statusFilter !== 'all' ? statusFilter : undefined],
    queryFn: () =>
      fetchAssertions(
        statusFilter !== 'all' ? { status: statusFilter, per_page: 100 } : { per_page: 100 }
      ),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Filter assertions client-side for search and token (exclude settled)
  const filteredAssertions = (data?.assertions || [])
    .filter((a) => !a.status.startsWith('settled'))
    .filter((assertion) => {
      if (statusFilter !== 'all' && assertion.status !== statusFilter) return false;
      if (tokenFilter !== 'all' && assertion.currency !== tokenFilter) return false;
      if (searchQuery) {
        const claimText = decodeBytes32(assertion.claim).toLowerCase();
        const query = searchQuery.toLowerCase();
        if (!claimText.includes(query) && !assertion.asserter.includes(query)) {
          return false;
        }
      }
      return true;
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Active Assertions</h1>
        <p className="text-foreground-secondary mt-1">
          View and dispute assertions during their liveness period
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
          <Input
            placeholder="Search by claim or asserter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AssertionStatus | 'all')}
          className="w-full sm:w-40"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="disputed">Disputed</option>
          <option value="pending_settlement">Pending Settlement</option>
          <option value="expired">Expired</option>
        </Select>
        <Select
          value={tokenFilter}
          onChange={(e) => setTokenFilter(e.target.value)}
          className="w-full sm:w-40"
        >
          <option value="all">All Tokens</option>
          {Object.entries(currencies).map(([id, config]) => (
            <option key={id} value={id}>
              {config.symbol}
            </option>
          ))}
        </Select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto text-primary mb-4 animate-spin" />
            <p className="text-foreground-secondary">Loading assertions...</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-warning mb-4" />
            <p className="text-foreground-secondary">
              Failed to load assertions. Make sure the indexer is running.
            </p>
            <p className="text-sm text-foreground-muted mt-2">{(error as Error).message}</p>
          </CardContent>
        </Card>
      )}

      {/* Assertions Grid */}
      {!isLoading && !error && (
        <div className="space-y-4">
          {filteredAssertions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Filter className="h-12 w-12 mx-auto text-foreground-muted mb-4" />
                <p className="text-foreground-secondary">No assertions found matching your filters.</p>
              </CardContent>
            </Card>
          ) : (
            filteredAssertions.map((assertion) => (
              <AssertionCard key={assertion.assertion_id} assertion={assertion} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function AssertionCard({ assertion }: { assertion: IndexerAssertion }) {
  const { signedAccountId } = useNearWallet();
  const disputeMutation = useDisputeAssertion();
  const settleMutation = useSettleAssertion();
  const retrySettlementMutation = useRetrySettlementPayout();
  const { addToast } = useToast();
  const [showDisputeConfirm, setShowDisputeConfirm] = useState(false);

  const currencies = getCurrencies(DEFAULT_NETWORK);
  const currencyConfig = currencies[assertion.currency];
  const claimText = decodeClaimForDisplay(assertion.claim);
  const expirationMs = nsToMs(assertion.expiration_time_ns);
  const isExpired = expirationMs < Date.now();
  const settlementPending = assertion.settlement_pending;
  const settlementInFlight = assertion.settlement_in_flight;
  const canRetrySettlement = settlementPending && !settlementInFlight;

  const statusConfig = {
    active: { color: 'success' as const, label: 'Active', icon: Clock },
    disputed: { color: 'warning' as const, label: 'Disputed', icon: AlertTriangle },
    pending_settlement: { color: 'warning' as const, label: 'Pending Settlement', icon: Clock },
    expired: { color: 'muted' as const, label: 'Expired', icon: CheckCircle },
    settled_true: { color: 'success' as const, label: 'Settled True', icon: CheckCircle },
    settled_false: { color: 'error' as const, label: 'Settled False', icon: CheckCircle },
  };

  const status = statusConfig[assertion.status];
  const StatusIcon = status.icon;

  const handleDispute = async () => {
    try {
      await disputeMutation.mutateAsync({
        assertionId: assertion.assertion_id,
        currency: assertion.currency,
        bondAmount: assertion.bond,
      });
      addToast({ type: 'success', title: 'Dispute submitted', message: 'The assertion has been disputed.' });
    } catch (err) {
      addToast({ type: 'error', title: 'Dispute failed', message: (err as Error).message });
    }
    setShowDisputeConfirm(false);
  };

  const handleSettle = async () => {
    try {
      await settleMutation.mutateAsync({ assertionId: assertion.assertion_id });
      addToast({
        type: 'success',
        title: 'Settlement initiated',
        message: 'Payout callback is in progress. Final settled state will update shortly.',
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Settle failed', message: (err as Error).message });
    }
  };

  const handleRetrySettlement = async () => {
    try {
      await retrySettlementMutation.mutateAsync({ assertionId: assertion.assertion_id });
      addToast({
        type: 'success',
        title: 'Settlement retry submitted',
        message: 'Retrying settlement payout callback.',
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Retry failed', message: (err as Error).message });
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
            {/* Main Content */}
            <div className="flex-1 space-y-3">
              {/* Claim */}
              <p className="text-foreground font-medium">
                {claimText || 'Unable to decode claim'}
              </p>

              {/* Details */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-foreground-muted">Asserter: </span>
                  <span className="font-mono text-foreground-secondary">
                    {formatAccountId(assertion.asserter)}
                  </span>
                </div>
                <div>
                  <span className="text-foreground-muted">Bond: </span>
                  <span className="text-foreground-secondary">
                    {formatTokenAmount(assertion.bond, currencyConfig?.decimals || 6)}{' '}
                    {currencyConfig?.symbol || 'tokens'}
                  </span>
                </div>
                <div>
                  <span className="text-foreground-muted">
                    {isExpired ? 'Expired: ' : 'Expires: '}
                  </span>
                  <span className="text-foreground-secondary">
                    {isExpired
                      ? new Date(expirationMs).toLocaleDateString()
                      : formatRelativeTime(expirationMs)}
                  </span>
                </div>
              </div>

              {/* Disputer info if disputed */}
              {assertion.disputer && (
                <div className="text-sm">
                  <span className="text-foreground-muted">Disputer: </span>
                  <span className="font-mono text-foreground-secondary">
                    {formatAccountId(assertion.disputer)}
                  </span>
                </div>
              )}
            </div>

            {/* Status & Action */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3">
              <Badge variant={status.color} className="flex items-center gap-1.5">
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>

              {settlementPending && (
                <span className="text-xs text-foreground-muted">
                  {settlementInFlight
                    ? 'Settlement pending payout callback'
                    : 'Settlement pending (retry available)'}
                </span>
              )}

              {assertion.status === 'active' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDisputeConfirm(true)}
                  disabled={!signedAccountId || disputeMutation.isPending}
                >
                  Dispute
                </Button>
              )}
              {assertion.status === 'expired' && (
                settlementPending ? (
                  canRetrySettlement ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRetrySettlement}
                      disabled={!signedAccountId || retrySettlementMutation.isPending}
                      loading={retrySettlementMutation.isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-1.5" />
                      Retry Settlement
                    </Button>
                  ) : null
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleSettle}
                    disabled={!signedAccountId || settleMutation.isPending}
                    loading={settleMutation.isPending}
                  >
                    Settle
                  </Button>
                )
              )}
              {assertion.status === 'pending_settlement' && canRetrySettlement && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetrySettlement}
                  disabled={!signedAccountId || retrySettlementMutation.isPending}
                  loading={retrySettlementMutation.isPending}
                >
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  Retry Settlement
                </Button>
              )}
              {assertion.status === 'disputed' && (
                <span className="text-xs text-foreground-muted">
                  {settlementPending ? 'Settlement in progress' : 'Pending DVM Vote'}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <DisputeDialog
        isOpen={showDisputeConfirm}
        onClose={() => setShowDisputeConfirm(false)}
        onConfirm={handleDispute}
        bondAmount={assertion.bond}
        currencyConfig={currencyConfig}
        claimText={claimText}
        isLoading={disputeMutation.isPending}
      />
    </>
  );
}
