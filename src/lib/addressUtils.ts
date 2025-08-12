/**
 * Utilities for handling Ethereum addresses
 */

/**
 * Simple address validation without normalization
 * 
 * @param address - The Ethereum address to validate
 * @returns The address as-is if valid, or null if invalid
 */
export function normalizeAddress(address: string | undefined | null): string | null {
  if (!address) return null;
  
  // Check if it's a valid Ethereum address format (0x followed by 40 hex characters)
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return null; // Return null if not a valid Ethereum address
  }
  
  return address; // Return as-is without case modification
}

/**
 * Gets the address for display purposes (no checksumming)
 * 
 * @param address - The address to process
 * @returns The address as-is
 */
export function getChecksumAddress(address: string): string {
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return address;
  }
  
  return address; // Return as-is without modification
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
  const validated = normalizeAddress(address);
  if (!validated) return address;
  
  if (validated.length <= 2 + length * 2) {
    return validated;
  }
  
  return `${validated.slice(0, 2 + length)}...${validated.slice(-length)}`;
}
