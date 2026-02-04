'use client';

import { useState, useEffect } from 'react';
import { useNearWallet } from 'near-connect-hooks';
import { useQuery } from '@tanstack/react-query';
import { Info, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { LIVENESS_OPTIONS } from '@/types';
import { getCurrencies, getContracts, DEFAULT_NETWORK } from '@/lib/near/config';
import { encodeBytes32Array } from '@/lib/bytes32';
import { getTokenBalance } from '@/lib/near/contracts';
import { formatTokenAmount, parseTokenAmount } from '@/lib/utils';

export default function ProposePage() {
  const { signedAccountId, callFunction } = useNearWallet();
  const [claim, setClaim] = useState('');
  const [currency, setCurrency] = useState('');
  const [bondAmount, setBondAmount] = useState('');
  const [liveness, setLiveness] = useState(LIVENESS_OPTIONS[0].value);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [callbackRecipient, setCallbackRecipient] = useState('');
  const [escalationManager, setEscalationManager] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const currencies = getCurrencies(DEFAULT_NETWORK);
  const contracts = getContracts(DEFAULT_NETWORK);
  const currencyList = Object.entries(currencies);

  // Set default currency when component mounts
  useEffect(() => {
    if (currencyList.length > 0 && !currency) {
      setCurrency(currencyList[0][0]);
    }
  }, []);

  const selectedCurrency = currency ? currencies[currency] : null;

  const { data: tokenBalance } = useQuery({
    queryKey: ['tokenBalance', currency, signedAccountId],
    queryFn: () => getTokenBalance(currency, signedAccountId!),
    enabled: !!signedAccountId && !!currency,
    staleTime: 15000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!signedAccountId) {
      setError('Please connect your wallet first');
      return;
    }

    if (!claim.trim()) {
      setError('Please enter a claim');
      return;
    }

    if (!bondAmount || parseFloat(bondAmount) <= 0) {
      setError('Please enter a valid bond amount');
      return;
    }

    setIsSubmitting(true);

    try {
      const claimBytes32 = encodeBytes32Array(claim);
      const bondAmountRaw = parseTokenAmount(bondAmount, selectedCurrency?.decimals || 6);

      const msg = JSON.stringify({
        action: 'AssertTruth',
        claim: claimBytes32,
        asserter: signedAccountId,
        callback_recipient: callbackRecipient || null,
        escalation_manager: escalationManager || null,
        liveness_ns: liveness,
        identifier: null,
        domain_id: null,
      });

      await callFunction({
        contractId: currency,
        method: 'ft_transfer_call',
        args: {
          receiver_id: contracts.oracle,
          amount: bondAmountRaw,
          msg,
        },
        gas: '100000000000000',
        deposit: '1',
      });

      // Reset form on success
      setClaim('');
      setBondAmount('');
      setCallbackRecipient('');
      setEscalationManager('');
      addToast({ type: 'success', title: 'Assertion submitted', message: 'Your assertion is now live and can be disputed during the liveness period.' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit assertion');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Make an Assertion</CardTitle>
          <CardDescription>
            Assert a truth about the world. Back it with a bond to show you believe in your claim.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Claim */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Claim
              </label>
              <Textarea
                placeholder="Enter your assertion (e.g., 'The price of BTC exceeded $50,000 on January 25, 2025')"
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
                className="min-h-[120px]"
              />
              <p className="text-xs text-foreground-muted">
                Be specific and verifiable. Claims are encoded as bytes32.
              </p>
            </div>

            {/* Bond Currency */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Bond Token
              </label>
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {currencyList.map(([id, config]) => (
                  <option key={id} value={id}>
                    {config.symbol}
                  </option>
                ))}
              </Select>
            </div>

            {/* Bond Amount */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Bond Amount
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={bondAmount}
                  onChange={(e) => setBondAmount(e.target.value)}
                />
                {selectedCurrency && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-foreground-muted">
                    {selectedCurrency.symbol}
                  </span>
                )}
              </div>
              <div className="flex justify-between text-xs">
                <p className="text-foreground-muted">
                  This amount will be locked as your bond. Disputers must match this amount.
                </p>
                {signedAccountId && tokenBalance && selectedCurrency && (
                  <span className="text-foreground-secondary whitespace-nowrap ml-2">
                    Balance: {formatTokenAmount(tokenBalance, selectedCurrency.decimals)} {selectedCurrency.symbol}
                  </span>
                )}
              </div>
            </div>

            {/* Liveness Period */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Liveness Period
              </label>
              <Select
                value={liveness}
                onChange={(e) => setLiveness(e.target.value)}
              >
                {LIVENESS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-foreground-muted">
                Time window during which your assertion can be disputed.
              </p>
            </div>

            {/* Advanced Settings */}
            <div className="border border-border rounded-lg">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-4 text-sm font-medium text-foreground-secondary hover:text-foreground transition-colors"
              >
                <span>Advanced Settings</span>
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showAdvanced && (
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Callback Recipient (optional)
                    </label>
                    <Input
                      placeholder="account.near"
                      value={callbackRecipient}
                      onChange={(e) => setCallbackRecipient(e.target.value)}
                    />
                    <p className="text-xs text-foreground-muted">
                      Contract to notify when the assertion is settled.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Escalation Manager (optional)
                    </label>
                    <Input
                      placeholder="manager.near"
                      value={escalationManager}
                      onChange={(e) => setEscalationManager(e.target.value)}
                    />
                    <p className="text-xs text-foreground-muted">
                      Custom escalation manager for dispute handling.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-error-light text-red-800 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Info Box */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary-light text-foreground text-sm">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
              <span>
                Submitting will call <code className="font-mono text-xs bg-background px-1 py-0.5 rounded">ft_transfer_call</code> on the selected token to bond your assertion.
              </span>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={!signedAccountId || isSubmitting}
              loading={isSubmitting}
            >
              {!signedAccountId ? 'Connect Wallet to Submit' : 'Submit Assertion'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
