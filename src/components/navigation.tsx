'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNearWallet } from 'near-connect-hooks';
import { LogOut, Wallet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn, formatAccountId } from '@/lib/utils';

export const Navigation = () => {
  const pathname = usePathname();
  const { signedAccountId, loading, signIn, signOut } = useNearWallet();

  const isAppPage = pathname?.startsWith('/app');

  const handleWalletAction = () => {
    if (signedAccountId) {
      signOut();
    } else {
      signIn();
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-foreground">N</span>
            </div>
            <span className="text-xl font-semibold text-foreground">Nest</span>
          </Link>

          {/* App Navigation Tabs (only shown on /app pages) */}
          {isAppPage && (
            <div className="hidden sm:flex items-center gap-1">
              <NavTab href="/app/propose" active={pathname === '/app/propose'}>
                Propose
              </NavTab>
              <NavTab href="/app/verify" active={pathname === '/app/verify'}>
                Verify
              </NavTab>
              <NavTab href="/app/settled" active={pathname === '/app/settled'}>
                Settled
              </NavTab>
              <NavTab href="/app/vote" active={pathname === '/app/vote'}>
                Vote
              </NavTab>
            </div>
          )}

          {/* Right side: Wallet */}
          <div className="flex items-center gap-3">
            {signedAccountId ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-sm font-mono text-foreground-secondary">
                  {formatAccountId(signedAccountId)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleWalletAction}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Disconnect</span>
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleWalletAction}
                loading={loading}
                className="gap-2"
              >
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </Button>
            )}
          </div>
        </div>

        {/* Mobile App Navigation */}
        {isAppPage && (
          <div className="flex sm:hidden overflow-x-auto pb-3 -mx-4 px-4 gap-1">
            <NavTab href="/app/propose" active={pathname === '/app/propose'}>
              Propose
            </NavTab>
            <NavTab href="/app/verify" active={pathname === '/app/verify'}>
              Verify
            </NavTab>
            <NavTab href="/app/settled" active={pathname === '/app/settled'}>
              Settled
            </NavTab>
            <NavTab href="/app/vote" active={pathname === '/app/vote'}>
              Vote
            </NavTab>
          </div>
        )}
      </div>
    </nav>
  );
};

interface NavTabProps {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}

function NavTab({ href, active, children }: NavTabProps) {
  return (
    <Link
      href={href}
      className={cn(
        'px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap',
        active
          ? 'bg-primary-light text-foreground'
          : 'text-foreground-secondary hover:text-foreground hover:bg-background-muted'
      )}
    >
      {children}
    </Link>
  );
}
