'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatTokenAmount } from '@/lib/utils';
import type { CurrencyConfig } from '@/types';

interface DisputeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  bondAmount: string;
  currencyConfig: CurrencyConfig | undefined;
  claimText: string;
  isLoading: boolean;
}

export function DisputeDialog({
  isOpen,
  onClose,
  onConfirm,
  bondAmount,
  currencyConfig,
  claimText,
  isLoading,
}: DisputeDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Confirm Dispute
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-foreground-secondary">
            You are about to dispute the following assertion:
          </p>
          <blockquote className="border-l-2 border-primary pl-4 italic text-foreground">
            &ldquo;{claimText}&rdquo;
          </blockquote>
          <div className="bg-amber-50 p-3 rounded-lg text-sm border border-amber-200">
            <p className="font-medium text-amber-800">Bond Required</p>
            <p className="text-amber-700 mt-1">
              You must bond{' '}
              <span className="font-mono font-bold">
                {formatTokenAmount(
                  bondAmount,
                  currencyConfig?.decimals || 6
                )}{' '}
                {currencyConfig?.symbol || 'tokens'}
              </span>{' '}
              to dispute this assertion. This bond will be locked until the
              dispute is resolved by the DVM.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={onConfirm}
              loading={isLoading}
            >
              Dispute Assertion
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
