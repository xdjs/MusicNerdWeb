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
 * Generate a Jazzicon for a given address
 */
export function generateJazzicon(address: string, size: number = 32): HTMLElement {
  try {
    // Convert address to a number for Jazzicon seed
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
