// DVM contract types (matching Rust structs in nest-contracts/contracts/dvm/voting)

export type DvmVotingPhase = 'Commit' | 'Reveal' | 'Resolved';
export type DvmRequestStatus = 'Pending' | 'Active' | 'Resolved';
export type DvmResolvePriceOutcome =
  | 'Resolved'
  | 'RevealExtended'
  | 'EmergencyRequired'
  | 'Unknown';

/** PriceRequest from the DVM voting contract */
export interface DvmPriceRequest {
  identifier: string;
  timestamp: number;
  ancillary_data: number[];
  requester: string;
  status: DvmRequestStatus;
  phase: DvmVotingPhase;
  /** Nanoseconds since epoch */
  commit_start_time: number;
  /** Nanoseconds since epoch (0 if not yet in reveal) */
  reveal_start_time: number;
  resolved_price: string | number | null;
  revealed_stake?: string | number;
  low_participation_extensions?: number;
  emergency_required?: boolean;
}

/** Assertion view from oracle.get_assertion() */
export interface OracleAssertionState {
  settled: boolean;
  settlement_pending: boolean;
  settlement_in_flight: boolean;
  settlement_resolution: boolean;
}

/** DVM configuration from get_config() */
export interface DvmConfig {
  commit_phase_duration: number;
  reveal_phase_duration: number;
  min_participation_rate: number;
}

/** Vote commitment stored in localStorage */
export interface StoredVoteCommitment {
  /** Hex string of the DVM request_id CryptoHash */
  request_id: string;
  /** Hex string of the assertion_id (for display) */
  assertion_id: string;
  /** "1000000000000000000" for TRUE, "0" for FALSE */
  price: string;
  /** 32-byte salt as number array */
  salt: number[];
  /** 32-byte commit hash as number array */
  commit_hash: number[];
  /** Timestamp (ms) when committed */
  committed_at: number;
}
