import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a NEAR account ID for display
 * Truncates long account IDs like: alice.near → alice.near
 * but: verylongaccountname123456.near → verylo...56.near
 */
export function formatAccountId(accountId: string, maxLength = 20): string {
  if (accountId.length <= maxLength) return accountId;
  const start = accountId.slice(0, maxLength - 8);
  const end = accountId.slice(-6);
  return `${start}...${end}`;
}

/**
 * Convert nanoseconds to milliseconds
 */
export function nsToMs(ns: number | string): number {
  return Number(ns) / 1_000_000;
}

/**
 * Convert milliseconds to nanoseconds
 */
export function msToNs(ms: number): string {
  return (ms * 1_000_000).toString();
}

/**
 * Format a duration in a human-readable way
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Format a timestamp as relative time
 */
export function formatRelativeTime(timestampMs: number): string {
  const now = Date.now();
  const diff = timestampMs - now;

  if (diff <= 0) return 'Expired';
  return `${formatDuration(diff)} remaining`;
}

/**
 * Format a token amount with decimals
 */
export function formatTokenAmount(amount: string | bigint, decimals: number, maxDecimals = 4): string {
  const value = typeof amount === 'string' ? BigInt(amount) : amount;
  const divisor = BigInt(10 ** decimals);
  const whole = value / divisor;
  const remainder = value % divisor;

  if (remainder === BigInt(0)) {
    return whole.toString();
  }

  const fractionStr = remainder.toString().padStart(decimals, '0');
  const trimmed = fractionStr.slice(0, maxDecimals).replace(/0+$/, '');

  if (!trimmed) return whole.toString();
  return `${whole}.${trimmed}`;
}

/**
 * Parse a token amount string to the smallest unit
 */
export function parseTokenAmount(amount: string, decimals: number): string {
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  const combined = whole + paddedFraction;
  return BigInt(combined).toString();
}
