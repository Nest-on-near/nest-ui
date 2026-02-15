/**
 * Utilities for encoding/decoding Bytes32 hex strings
 * Used for claim text and identifiers in the oracle
 */

import { keccak256 as keccak256Impl } from 'js-sha3';

/**
 * Encode a UTF-8 string to a Bytes32 hex string (0x prefixed, 64 chars)
 * If the string is longer than 32 bytes, it will be truncated
 */
export function encodeBytes32(text: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);

  // Create a 32-byte array
  const buffer = new Uint8Array(32);

  // Copy bytes (up to 32)
  const copyLength = Math.min(bytes.length, 32);
  buffer.set(bytes.slice(0, copyLength));

  // Convert to hex
  let hex = '0x';
  for (const byte of buffer) {
    hex += byte.toString(16).padStart(2, '0');
  }

  return hex;
}

/**
 * Decode a Bytes32 hex string back to UTF-8 text
 * Trims trailing null bytes
 */
export function decodeBytes32(hex: string): string {
  // Remove 0x prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;

  // Convert hex to bytes
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }

  // Find the end of the actual content (first null byte)
  let end = bytes.length;
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0) {
      end = i;
      break;
    }
  }

  // Decode to string
  const decoder = new TextDecoder();
  return decoder.decode(bytes.slice(0, end));
}

/**
 * Decode bytes32 for UI display.
 * If bytes are not mostly printable UTF-8 text, return a short hash label.
 */
export function decodeClaimForDisplay(hex: string): string {
  const decoded = decodeBytes32(hex);
  const printable = decoded.replace(/[^\x20-\x7E]/g, '');
  const isMostlyPrintable = decoded.length > 0 && printable.length / decoded.length > 0.9;

  if (isMostlyPrintable && printable.trim().length > 0) {
    return printable;
  }

  const normalized = hex.startsWith('0x') ? hex.toLowerCase() : `0x${hex.toLowerCase()}`;
  return `Claim Hash: ${normalized.slice(0, 10)}...${normalized.slice(-8)}`;
}

/**
 * Encode a longer text as multiple Bytes32 values (for claims > 32 bytes)
 * Returns an array of hex strings
 */
export function encodeMultiBytes32(text: string): string[] {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);

  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += 32) {
    const chunk = new Uint8Array(32);
    const slice = bytes.slice(i, i + 32);
    chunk.set(slice);

    let hex = '0x';
    for (const byte of chunk) {
      hex += byte.toString(16).padStart(2, '0');
    }
    chunks.push(hex);
  }

  // Ensure at least one chunk
  if (chunks.length === 0) {
    chunks.push('0x' + '00'.repeat(32));
  }

  return chunks;
}

/**
 * Decode multiple Bytes32 values back to a single string
 */
export function decodeMultiBytes32(hexArray: string[]): string {
  const allBytes: number[] = [];

  for (const hex of hexArray) {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    for (let i = 0; i < cleanHex.length; i += 2) {
      allBytes.push(parseInt(cleanHex.slice(i, i + 2), 16));
    }
  }

  // Find the end (first null byte from the end that marks padding)
  let end = allBytes.length;
  while (end > 0 && allBytes[end - 1] === 0) {
    end--;
  }

  const decoder = new TextDecoder();
  return decoder.decode(new Uint8Array(allBytes.slice(0, end)));
}

/**
 * Encode a UTF-8 string to a Bytes32 number array (for contract args)
 * The contract expects [u8; 32] which serializes as a JSON number array
 */
export function encodeBytes32Array(text: string): number[] {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const buffer = new Uint8Array(32);
  const copyLength = Math.min(bytes.length, 32);
  buffer.set(bytes.slice(0, copyLength));
  return Array.from(buffer);
}

/**
 * Convert a hex string (0x-prefixed) to a number array for contract args
 * e.g. "0x51012960..." -> [81, 1, 41, 96, ...]
 */
export function hexToBytes32Array(hex: string): number[] {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes: number[] = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.slice(i, i + 2), 16));
  }
  // Pad to 32 bytes if shorter
  while (bytes.length < 32) {
    bytes.push(0);
  }
  return bytes.slice(0, 32);
}

/**
 * Convert a number array (e.g. CryptoHash) back to a 0x-prefixed hex string
 */
export function bytes32ArrayToHex(arr: number[]): string {
  return '0x' + arr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if a string is a valid Bytes32 hex
 */
export function isValidBytes32(hex: string): boolean {
  if (!hex.startsWith('0x')) return false;
  const cleanHex = hex.slice(2);
  if (cleanHex.length !== 64) return false;
  return /^[0-9a-fA-F]+$/.test(cleanHex);
}

/**
 * Generate a random Bytes32 (for salts, etc.)
 */
export function randomBytes32(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);

  let hex = '0x';
  for (const byte of array) {
    hex += byte.toString(16).padStart(2, '0');
  }

  return hex;
}

/**
 * Compute keccak256 hash of a string
 */
export function keccak256(data: string): string {
  return '0x' + keccak256Impl(data);
}

/**
 * Compute keccak256 hash of packed values (for vote commitment)
 */
export function keccak256Packed(...values: string[]): string {
  return '0x' + keccak256Impl(values.join(''));
}
