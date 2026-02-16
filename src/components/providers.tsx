'use client';

import { ReactNode, useState } from 'react';
import { NearProvider } from 'near-connect-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/ui/toast';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const network = process.env.NEXT_PUBLIC_NEAR_NETWORK === 'testnet' ? 'testnet' : 'mainnet';
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchInterval: 60_000,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <NearProvider config={{ network }}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </NearProvider>
    </QueryClientProvider>
  );
}
