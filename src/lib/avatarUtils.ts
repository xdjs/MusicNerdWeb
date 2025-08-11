import { createPublicClient, http } from 'viem';
import { mainnet } from 'wagmi/chains';
import { createEnsPublicClient } from '@ensdomains/ensjs';
import jazzicon from '@metamask/jazzicon';

// Create ENS client
const ensClient = createEnsPublicClient({
  chain: mainnet,
  transport: http(),
});

// Create Viem client for ENS queries
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

export interface AvatarData {
  type: 'ens' | 'jazzicon' | 'default';
  src?: string;
  element?: HTMLElement;
}

/**
 * Get ENS profile picture for a given address
 */
export async function getEnsAvatar(address: string): Promise<string | null> {
  try {
    // First try to get the ENS name for the address
    const ensNameResult = await ensClient.getName({
      address: address as `0x${string}`,
    });

    if (!ensNameResult) {
      return null;
    }

    // Then get the avatar text record for the ENS name
    const avatar = await ensClient.getTextRecord({
      name: ensNameResult.name,
      key: 'avatar',
    });

    return avatar || null;
  } catch (error) {
    console.debug('[AvatarUtils] Error fetching ENS avatar:', error);
    return null;
  }
}

/**
 * Generate a Jazzicon for a given address using MetaMask's existing seed
 */
export function generateJazzicon(address: string, size: number = 32): HTMLElement {
  try {
    // Try to get the existing MetaMask Jazzicon seed first
    const existingSeed = getExistingJazziconSeed(address);
    
    if (existingSeed !== null) {
      // Use the existing seed from MetaMask
      const element = jazzicon(size, existingSeed);
      element.style.width = `${size}px`;
      element.style.height = `${size}px`;
      return element;
    }
    
    // Fallback to generating seed from address (same as MetaMask does)
    const addr = address.slice(2, 10);
    const seed = parseInt(addr, 16);
    
    // Generate the Jazzicon
    const element = jazzicon(size, seed);
    
    // Ensure it has the right size
    element.style.width = `${size}px`;
    element.style.height = `${size}px`;
    
    return element;
  } catch (error) {
    console.debug('[AvatarUtils] Error generating Jazzicon:', error);
    // Return a fallback div
    const fallback = document.createElement('div');
    fallback.style.width = `${size}px`;
    fallback.style.height = `${size}px`;
    fallback.style.backgroundColor = '#f0f0f0';
    fallback.style.borderRadius = '50%';
    return fallback;
  }
}

/**
 * Get the best available avatar for a user
 * Priority: ENS avatar > Existing Jazzicon > Default
 */
export async function getUserAvatar(address: string): Promise<AvatarData> {
  try {
    // Try ENS avatar first
    const ensAvatar = await getEnsAvatar(address);
    if (ensAvatar) {
      return {
        type: 'ens',
        src: ensAvatar,
      };
    }

    // Check if user has an existing Jazzicon seed
    if (hasExistingJazzicon(address)) {
      return {
        type: 'jazzicon',
        element: generateJazzicon(address, 32),
      };
    }

    // Fallback to default
    return {
      type: 'default',
      src: '/default_pfp.png',
    };
  } catch (error) {
    console.debug('[AvatarUtils] Error getting user avatar:', error);
    // Fallback to default
    return {
      type: 'default',
      src: '/default_pfp.png',
    };
  }
}

/**
 * Get the existing MetaMask Jazzicon seed for an address
 */
export function getExistingJazziconSeed(address: string): number | null {
  try {
    // Check if there's a stored Jazzicon seed
    const jazziconSeed = localStorage.getItem(`jazzicon_${address.toLowerCase()}`);
    if (jazziconSeed) {
      const seed = parseInt(jazziconSeed, 10);
      if (!isNaN(seed)) return seed;
    }

    // Check MetaMask's internal storage for Jazzicon seeds
    const metamaskData = localStorage.getItem(`metamask_${address.toLowerCase()}`);
    if (metamaskData) {
      try {
        const data = JSON.parse(metamaskData);
        if (data.jazziconSeed && typeof data.jazziconSeed === 'number') {
          return data.jazziconSeed;
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    // Check if there's a cached seed in our own storage
    const cachedSeed = localStorage.getItem(`cached_jazzicon_seed_${address.toLowerCase()}`);
    if (cachedSeed) {
      const seed = parseInt(cachedSeed, 10);
      if (!isNaN(seed)) return seed;
    }

    return null;
  } catch (error) {
    console.debug('[AvatarUtils] Error getting existing Jazzicon seed:', error);
    return null;
  }
}

/**
 * Check if an address has an existing Jazzicon seed in MetaMask
 * This checks various indicators that the user already has a Jazzicon
 */
export function hasExistingJazzicon(address: string): boolean {
  try {
    // Check if there's any existing avatar data in localStorage
    const existingAvatar = localStorage.getItem(`avatar_${address.toLowerCase()}`);
    if (existingAvatar) return true;

    // Check if there's a Jazzicon seed stored in MetaMask's format
    const jazziconSeed = localStorage.getItem(`jazzicon_${address.toLowerCase()}`);
    if (jazziconSeed) return true;

    // Check if the address has been used before (indicates existing Jazzicon)
    const addressHistory = localStorage.getItem('metamask_address_history');
    if (addressHistory) {
      const history = JSON.parse(addressHistory);
      if (history.includes(address.toLowerCase())) return true;
    }

    // Check if there's any MetaMask-related data for this address
    const metamaskData = localStorage.getItem(`metamask_${address.toLowerCase()}`);
    if (metamaskData) return true;

    // Check if the address has been used in transactions (indicates existing Jazzicon)
    const txHistory = localStorage.getItem(`tx_history_${address.toLowerCase()}`);
    if (txHistory) return true;

    return false;
  } catch (error) {
    console.debug('[AvatarUtils] Error checking existing Jazzicon:', error);
    return false;
  }
}
