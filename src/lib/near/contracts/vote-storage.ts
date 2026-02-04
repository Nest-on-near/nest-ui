import type { StoredVoteCommitment } from './types';

const STORAGE_KEY = 'nest_vote_commitments';

/**
 * Get all stored vote commitments for an account
 */
export function getStoredCommitments(
  accountId: string
): StoredVoteCommitment[] {
  if (typeof window === 'undefined') return [];
  const key = `${STORAGE_KEY}_${accountId}`;
  const stored = localStorage.getItem(key);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Store a vote commitment (replaces if same request_id exists)
 */
export function storeCommitment(
  accountId: string,
  commitment: StoredVoteCommitment
): void {
  if (typeof window === 'undefined') return;
  const key = `${STORAGE_KEY}_${accountId}`;
  const existing = getStoredCommitments(accountId);
  const filtered = existing.filter(
    (c) => c.request_id !== commitment.request_id
  );
  filtered.push(commitment);
  localStorage.setItem(key, JSON.stringify(filtered));
}

/**
 * Get commitment for a specific DVM request
 */
export function getCommitmentForRequest(
  accountId: string,
  requestIdHex: string
): StoredVoteCommitment | null {
  const commitments = getStoredCommitments(accountId);
  return commitments.find((c) => c.request_id === requestIdHex) || null;
}

/**
 * Remove a commitment after successful reveal
 */
export function removeCommitment(
  accountId: string,
  requestIdHex: string
): void {
  if (typeof window === 'undefined') return;
  const key = `${STORAGE_KEY}_${accountId}`;
  const existing = getStoredCommitments(accountId);
  const filtered = existing.filter((c) => c.request_id !== requestIdHex);
  localStorage.setItem(key, JSON.stringify(filtered));
}
