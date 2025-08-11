import { getAddress, isAddress } from 'viem';

/**
 * Normalizes an Ethereum address to ensure consistent formatting.
 * - Validates the address format
 * - Returns the checksummed version
 * - Returns null for invalid addresses
 */
export function normalizeAddress(address: string): string | null {
  try {
    // Remove any whitespace
    const trimmed = address.trim();
    
    // Check if it's a valid Ethereum address
    if (!isAddress(trimmed)) {
      return null;
    }
    
    // Return the checksummed version
    return getAddress(trimmed);
  } catch (error) {
    console.error('Error normalizing address:', error);
    return null;
  }
}

/**
 * Checks if a string is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return normalizeAddress(address) !== null;
}

/**
 * Formats an address for display (e.g., 0x1234...5678)
 */
export function formatAddressForDisplay(address: string, length: number = 6): string {
  const normalized = normalizeAddress(address);
  if (!normalized) return address;
  
  if (normalized.length <= 2 + length * 2) {
    return normalized;
  }
  
  return `${normalized.slice(0, 2 + length)}...${normalized.slice(-length)}`;
}
