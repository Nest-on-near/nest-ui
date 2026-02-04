// Assertion types based on the Rust contract structures

export interface EscalationManagerSettings {
  arbitrate_via_escalation_manager: boolean;
  discard_oracle: boolean;
  validate_disputers: boolean;
  asserting_caller: string;
  escalation_manager: string | null;
}

export interface Assertion {
  escalation_manager_settings: EscalationManagerSettings;
  asserter: string;
  assertion_time_ns: string; // U64 as string
  settled: boolean;
  currency: string;
  expiration_time_ns: string; // U64 as string
  settlement_resolution: boolean;
  domain_id: string; // Bytes32 hex
  identifier: string; // Bytes32 hex
  bond: string; // U128 as string
  callback_recipient: string | null;
  disputer: string | null;
  claim: string; // Bytes32 hex (the claim text encoded)
}

export type AssertionStatus =
  | 'active'        // Can be disputed
  | 'disputed'      // Waiting for DVM vote
  | 'expired'       // Liveness passed, can be settled
  | 'settled_true'  // Settled as true
  | 'settled_false'; // Settled as false

export interface AssertionWithStatus extends Assertion {
  assertion_id: string;
  status: AssertionStatus;
}

export interface VoteRequest {
  request_id: string;
  identifier: string;
  timestamp: number;
  ancillary_data: string;
  requester: string;
}

export type VotePhase = 'commit' | 'reveal' | 'none';

export interface CommittedVote {
  request_id: string;
  price: string; // "1" for TRUE, "0" for FALSE
  salt: string;
  committed_at: number;
}

// NEP-297 Event types
export interface AssertionMadeEvent {
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
}

export interface AssertionDisputedEvent {
  assertion_id: string;
  caller: string;
  disputer: string;
}

export interface AssertionSettledEvent {
  assertion_id: string;
  bond_recipient: string;
  disputed: boolean;
  settlement_resolution: boolean;
  settle_caller: string;
}

// Currency configuration
export interface CurrencyConfig {
  symbol: string;
  decimals: number;
  icon?: string;
}

// Liveness options
export interface LivenessOption {
  label: string;
  value: string; // nanoseconds as string
}

export const LIVENESS_OPTIONS: LivenessOption[] = [
  { label: '2 hours', value: '7200000000000' },
  { label: '6 hours', value: '21600000000000' },
  { label: '12 hours', value: '43200000000000' },
  { label: '24 hours', value: '86400000000000' },
  { label: '48 hours', value: '172800000000000' },
];
