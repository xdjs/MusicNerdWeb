import jazzicon from '@metamask/jazzicon';

/**
 * Check if a user has existing MetaMask Jazzicon data in localStorage
 */
export function hasExistingMetaMaskJazzicon(address: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const normalizedAddress = address.toLowerCase();
  
  // Check various localStorage keys where MetaMask might store Jazzicon data
  const possibleKeys = [
    `jazzicon_${normalizedAddress}`,
    `metamask_${normalizedAddress}`,
    `metamask_address_history`,
    `tx_history_${normalizedAddress}`,
    `cached_jazzicon_seed_${normalizedAddress}`,
    `avatar_${normalizedAddress}`
  ];
  
  return possibleKeys.some(key => {
    const data = localStorage.getItem(key);
    if (!data) return false;
    
    try {
      // Check if it's a JSON object with jazziconSeed
      const parsed = JSON.parse(data);
      return parsed && (parsed.jazziconSeed !== undefined || parsed.seed !== undefined);
    } catch {
      // Check if it's a direct seed number
      const seed = parseInt(data, 10);
      return !isNaN(seed) && seed > 0;
    }
  });
}

/**
 * Get existing MetaMask Jazzicon seed from localStorage
 */
export function getExistingMetaMaskJazziconSeed(address: string): number | null {
  if (typeof window === 'undefined') return null;
  
  const normalizedAddress = address.toLowerCase();
  
  // Check various localStorage keys where MetaMask might store Jazzicon data
  const possibleKeys = [
    `jazzicon_${normalizedAddress}`,
    `metamask_${normalizedAddress}`,
    `cached_jazzicon_seed_${normalizedAddress}`
  ];
  
  for (const key of possibleKeys) {
    const data = localStorage.getItem(key);
    if (!data) continue;
    
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed.jazziconSeed === 'number') {
        return parsed.jazziconSeed;
      }
      if (parsed && typeof parsed.seed === 'number') {
        return parsed.seed;
      }
    } catch {
      // If not JSON, try to parse as direct seed number
      const seed = parseInt(data, 10);
      if (!isNaN(seed) && seed > 0) {
        return seed;
      }
    }
  }
  
  return null;
}

/**
 * Generate a Jazzicon using existing MetaMask seed if available
 */
export function generateMetaMaskJazzicon(address: string, size: number = 32): HTMLElement | null {
  try {
    const existingSeed = getExistingMetaMaskJazziconSeed(address);
    
    if (existingSeed !== null) {
      // Use the existing MetaMask seed
      const element = jazzicon(size, existingSeed);
      element.style.width = `${size}px`;
      element.style.height = `${size}px`;
      return element;
    }
    
    // No existing seed found
    return null;
  } catch (error) {
    console.debug('[MetaMaskJazziconUtils] Error generating Jazzicon:', error);
    return null;
  }
}

/**
 * Convert a Jazzicon element to a data URL for use as image src
 */
export function jazziconToDataURL(element: HTMLElement): string {
  try {
    // Create a canvas to convert the SVG to a data URL
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    // Set canvas size
    const size = parseInt(element.style.width) || 32;
    canvas.width = size;
    canvas.height = size;
    
    // Convert SVG to string
    const svgString = element.outerHTML;
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    
    // Create an image to draw on canvas
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
    };
    img.src = url;
    
    // Convert canvas to data URL
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.debug('[MetaMaskJazziconUtils] Error converting Jazzicon to data URL:', error);
    return '';
  }
}
