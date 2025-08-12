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
  
  const hasData = possibleKeys.some(key => {
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
  
  console.debug('[MetaMaskJazziconUtils] hasExistingMetaMaskJazzicon:', {
    address: normalizedAddress,
    hasData,
    checkedKeys: possibleKeys
  });
  
  return hasData;
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
        console.debug('[MetaMaskJazziconUtils] Found Jazzicon seed in JSON:', { key, seed: parsed.jazziconSeed });
        return parsed.jazziconSeed;
      }
      if (parsed && typeof parsed.seed === 'number') {
        console.debug('[MetaMaskJazziconUtils] Found seed in JSON:', { key, seed: parsed.seed });
        return parsed.seed;
      }
    } catch {
      // If not JSON, try to parse as direct seed number
      const seed = parseInt(data, 10);
      if (!isNaN(seed) && seed > 0) {
        console.debug('[MetaMaskJazziconUtils] Found direct seed:', { key, seed });
        return seed;
      }
    }
  }
  
  console.debug('[MetaMaskJazziconUtils] No Jazzicon seed found for address:', normalizedAddress);
  return null;
}

/**
 * Generate a Jazzicon using the same algorithm as MetaMask
 * Since we can't access MetaMask's extension localStorage, we'll use the same seed generation
 */
export function generateMetaMaskJazzicon(address: string, size: number = 32): HTMLElement | null {
  try {
    if (!address || address.length < 10) {
      console.debug('[MetaMaskJazziconUtils] Invalid address:', address);
      return null;
    }

    // Use the same algorithm as MetaMask to generate the seed from the address
    // MetaMask takes the first 8 characters of the address (excluding 0x) and converts to integer
    const addr = address.slice(2, 10); // Remove 0x and take first 8 chars
    const seed = parseInt(addr, 16);
    
    if (isNaN(seed)) {
      console.debug('[MetaMaskJazziconUtils] Invalid seed generated:', { address, addr, seed });
      return null;
    }
    
    console.debug('[MetaMaskJazziconUtils] Generated Jazzicon with seed:', { address, addr, seed });
    
    // Generate the Jazzicon using the same seed algorithm as MetaMask
    const element = jazzicon(size, seed);
    element.style.width = `${size}px`;
    element.style.height = `${size}px`;
    
    console.debug('[MetaMaskJazziconUtils] Jazzicon element created successfully');
    return element;
  } catch (error) {
    console.debug('[MetaMaskJazziconUtils] Error generating Jazzicon:', error);
    return null;
  }
}

/**
 * Convert a Jazzicon element to a data URL for use as image src
 */
export function jazziconToDataURL(element: HTMLElement): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      console.debug('[MetaMaskJazziconUtils] Converting Jazzicon to data URL...');
      
      // Create a canvas to convert the SVG to a data URL
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.debug('[MetaMaskJazziconUtils] Could not get canvas context');
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Set canvas size
      const size = parseInt(element.style.width) || 32;
      canvas.width = size;
      canvas.height = size;
      
      // Convert SVG to string
      const svgString = element.outerHTML;
      console.debug('[MetaMaskJazziconUtils] SVG string length:', svgString.length);
      
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      
      // Create an image to draw on canvas
      const img = new Image();
      img.onload = () => {
        try {
          console.debug('[MetaMaskJazziconUtils] Image loaded, drawing to canvas...');
          ctx.drawImage(img, 0, 0, size, size);
          URL.revokeObjectURL(url);
          const dataURL = canvas.toDataURL('image/png');
          console.debug('[MetaMaskJazziconUtils] Data URL generated successfully, length:', dataURL.length);
          resolve(dataURL);
        } catch (error) {
          console.debug('[MetaMaskJazziconUtils] Error drawing image to canvas:', error);
          URL.revokeObjectURL(url);
          reject(error);
        }
      };
      img.onerror = (error) => {
        console.debug('[MetaMaskJazziconUtils] Error loading SVG image:', error);
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG image'));
      };
      img.src = url;
    } catch (error) {
      console.debug('[MetaMaskJazziconUtils] Error in jazziconToDataURL:', error);
      reject(error);
    }
  });
}
