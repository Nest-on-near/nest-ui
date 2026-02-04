'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAssertions, fetchHealth } from '@/lib/api';

function StatCard({ value, label, isLoading }: { value: string; label: string; isLoading?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-3xl sm:text-4xl font-bold text-foreground">
        {isLoading ? '...' : value}
      </p>
      <p className="mt-1 text-sm text-foreground-secondary">{label}</p>
    </div>
  );
}

export function StatsSection() {
  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 30000,
  });

  const { data: assertions, isLoading: assertionsLoading } = useQuery({
    queryKey: ['all-assertions'],
    queryFn: () => fetchAssertions({ per_page: 1000 }),
    refetchInterval: 30000,
  });

  const isLoading = healthLoading || assertionsLoading;

  // Calculate stats from assertions
  const allAssertions = assertions?.assertions || [];
  const disputedCount = allAssertions.filter((a) => a.status === 'disputed').length;
  const settledCount = allAssertions.filter((a) => a.status.startsWith('settled')).length;
  const resolutionRate = allAssertions.length > 0
    ? ((settledCount / allAssertions.length) * 100).toFixed(1)
    : '0';

  return (
    <section className="border-y border-border bg-background-subtle">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          <StatCard
            value={health?.assertions_count?.toString() || '0'}
            label="Total Assertions"
            isLoading={isLoading}
          />
          <StatCard
            value={health?.last_block_height?.toLocaleString() || '—'}
            label="Last Block"
            isLoading={isLoading}
          />
          <StatCard
            value={`${resolutionRate}%`}
            label="Resolution Rate"
            isLoading={isLoading}
          />
          <StatCard
            value={disputedCount.toString()}
            label="Active Disputes"
            isLoading={isLoading}
          />
        </div>
      </div>
    </section>
  );
}
