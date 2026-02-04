'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, CheckCircle, XCircle, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatAccountId, formatTokenAmount } from '@/lib/utils';
import { decodeBytes32 } from '@/lib/bytes32';
import { getCurrencies, DEFAULT_NETWORK } from '@/lib/near/config';
import { fetchAssertions, IndexerAssertion } from '@/lib/api';

export default function SettledPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | 'true' | 'false'>('all');
  const [disputedFilter, setDisputedFilter] = useState<'all' | 'yes' | 'no'>('all');

  // Fetch settled assertions from the indexer
  const { data, isLoading, error } = useQuery({
    queryKey: ['settled-assertions'],
    queryFn: () => fetchAssertions({ per_page: 100 }),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Filter to only settled assertions and apply client-side filters
  const filteredAssertions = (data?.assertions || [])
    .filter((a) => a.status.startsWith('settled'))
    .filter((assertion) => {
      if (resultFilter !== 'all') {
        const matchesResult =
          (resultFilter === 'true' && assertion.settlement_resolution) ||
          (resultFilter === 'false' && !assertion.settlement_resolution);
        if (!matchesResult) return false;
      }
      if (disputedFilter !== 'all') {
        const wasDisputed = assertion.disputer !== null;
        const matchesDisputed =
          (disputedFilter === 'yes' && wasDisputed) || (disputedFilter === 'no' && !wasDisputed);
        if (!matchesDisputed) return false;
      }
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
        <h1 className="text-2xl font-bold text-foreground">Settled Assertions</h1>
        <p className="text-foreground-secondary mt-1">
          View historical assertions and their resolutions
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
          value={resultFilter}
          onChange={(e) => setResultFilter(e.target.value as 'all' | 'true' | 'false')}
          className="w-full sm:w-40"
        >
          <option value="all">All Results</option>
          <option value="true">Resolved True</option>
          <option value="false">Resolved False</option>
        </Select>
        <Select
          value={disputedFilter}
          onChange={(e) => setDisputedFilter(e.target.value as 'all' | 'yes' | 'no')}
          className="w-full sm:w-40"
        >
          <option value="all">All</option>
          <option value="yes">Was Disputed</option>
          <option value="no">Undisputed</option>
        </Select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto text-primary mb-4 animate-spin" />
            <p className="text-foreground-secondary">Loading settled assertions...</p>
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

      {/* Assertions List */}
      {!isLoading && !error && (
        <div className="space-y-4">
          {filteredAssertions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-foreground-muted mb-4" />
                <p className="text-foreground-secondary">No settled assertions found.</p>
              </CardContent>
            </Card>
          ) : (
            filteredAssertions.map((assertion) => (
              <SettledAssertionCard key={assertion.assertion_id} assertion={assertion} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SettledAssertionCard({ assertion }: { assertion: IndexerAssertion }) {
  const currencies = getCurrencies(DEFAULT_NETWORK);
  const currencyConfig = currencies[assertion.currency];
  const claimText = decodeBytes32(assertion.claim);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
          {/* Main Content */}
          <div className="flex-1 space-y-3">
            {/* Result Badge */}
            <div className="flex items-center gap-3">
              {assertion.settlement_resolution ? (
                <Badge variant="success" className="flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3" />
                  TRUE
                </Badge>
              ) : (
                <Badge variant="error" className="flex items-center gap-1.5">
                  <XCircle className="h-3 w-3" />
                  FALSE
                </Badge>
              )}
              {assertion.disputer && (
                <Badge variant="muted">Via DVM</Badge>
              )}
            </div>

            {/* Claim */}
            <p className="text-foreground font-medium">
              {claimText || 'Unable to decode claim'}
            </p>

            {/* Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-foreground-muted">Asserter: </span>
                <span className="font-mono text-foreground-secondary">
                  {formatAccountId(assertion.asserter)}
                </span>
              </div>
              <div>
                <span className="text-foreground-muted">Settled: </span>
                <span className="text-foreground-secondary">
                  {new Date(assertion.updated_at * 1000).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div>
                <span className="text-foreground-muted">Bond: </span>
                <span className="text-foreground-secondary">
                  {formatTokenAmount(assertion.bond, currencyConfig?.decimals || 6)}{' '}
                  {currencyConfig?.symbol || 'tokens'}
                </span>
              </div>
              {assertion.bond_recipient && (
                <div>
                  <span className="text-foreground-muted">Bond Recipient: </span>
                  <span className="font-mono text-foreground-secondary">
                    {formatAccountId(assertion.bond_recipient)}
                  </span>
                </div>
              )}
              {assertion.disputer && (
                <div>
                  <span className="text-foreground-muted">Disputer: </span>
                  <span className="font-mono text-foreground-secondary">
                    {formatAccountId(assertion.disputer)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
