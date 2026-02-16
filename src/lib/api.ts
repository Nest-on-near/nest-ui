// API client for the nest-indexer

const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || 'http://127.0.0.1:3001';

export interface IndexerAssertion {
  assertion_id: string;
  domain_id: string;
  claim: string;
  asserter: string;
  callback_recipient: string | null;
  escalation_manager: string | null;
  caller: string;
  expiration_time_ns: string;
  currency: string;
  bond: string;
  identifier: string;
  disputer: string | null;
  settled: boolean;
  settlement_pending: boolean;
  settlement_in_flight: boolean;
  settlement_resolution: boolean;
  bond_recipient: string | null;
  status:
    | 'active'
    | 'disputed'
    | 'pending_settlement'
    | 'expired'
    | 'settled_true'
    | 'settled_false';
  created_at: number;
  updated_at: number;
  block_height: number;
  transaction_id: string;
}

export interface AssertionListResponse {
  assertions: IndexerAssertion[];
  total: number;
  page: number;
  per_page: number;
}

export interface HealthResponse {
  status: string;
  assertions_count: number;
  last_block_height: number | null;
}

export interface AssertionQuery {
  status?: string;
  asserter?: string;
  disputer?: string;
  currency?: string;
  settlement_pending?: boolean;
  settlement_in_flight?: boolean;
  page?: number;
  per_page?: number;
}

export async function fetchAssertions(query?: AssertionQuery): Promise<AssertionListResponse> {
  const params = new URLSearchParams();
  if (query?.status) params.set('status', query.status);
  if (query?.asserter) params.set('asserter', query.asserter);
  if (query?.disputer) params.set('disputer', query.disputer);
  if (query?.currency) params.set('currency', query.currency);
  if (query?.settlement_pending !== undefined) {
    params.set('settlement_pending', String(query.settlement_pending));
  }
  if (query?.settlement_in_flight !== undefined) {
    params.set('settlement_in_flight', String(query.settlement_in_flight));
  }
  if (query?.page) params.set('page', query.page.toString());
  if (query?.per_page) params.set('per_page', query.per_page.toString());

  const url = `${INDEXER_URL}/assertions${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch assertions: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchAssertion(assertionId: string): Promise<IndexerAssertion> {
  const response = await fetch(`${INDEXER_URL}/assertions/${assertionId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch assertion: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${INDEXER_URL}/health`);

  if (!response.ok) {
    throw new Error(`Failed to fetch health: ${response.statusText}`);
  }

  return response.json();
}
