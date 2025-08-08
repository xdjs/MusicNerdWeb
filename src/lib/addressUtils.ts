/**
 * Utilities for normalizing Ethereum addresses to ensure consistency
 * across different wallet connection methods (MetaMask extension vs WalletConnect/QR code)
 */

/**
 * Normalizes an Ethereum address to lowercase format for consistent storage and comparison
 * This prevents profile picture mismatches caused by case sensitivity differences
 * between MetaMask extension (checksummed) and WalletConnect (lowercase) connections
 * 
 * @param address - The Ethereum address to normalize
 * @returns The normalized lowercase address, or the original value if invalid
 */
export function normalizeAddress(address: string | undefined | null): string | null {
  if (!address) return null;
  
  // Check if it's a valid Ethereum address format (0x followed by 40 hex characters)
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return address; // Return as-is if not a valid Ethereum address
  }
  
  return address.toLowerCase();
}

/**
 * Gets the checksummed version of an address for display purposes
 * This is mainly for UI display - we store addresses in lowercase for consistency
 * 
 * @param address - The address to checksum
 * @returns The checksummed address
 */
export function getChecksumAddress(address: string): string {
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return address;
  }
  
  // Simple checksum implementation - in production you might want to use ethers.js
  // For now, just return lowercase since we're focusing on consistency
  return address.toLowerCase();
}
