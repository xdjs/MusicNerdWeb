import { generateJazzicon, hasExistingJazzicon } from '../avatarUtils';

// Mock the ENS client and Jazzicon
jest.mock('@metamask/jazzicon', () => {
  return jest.fn(() => {
    const div = document.createElement('div');
    div.style.width = '32px';
    div.style.height = '32px';
    div.style.backgroundColor = '#ff0000';
    div.style.borderRadius = '50%';
    return div;
  });
});

jest.mock('@ensdomains/ensjs', () => ({
  createEnsPublicClient: jest.fn(() => ({
    getName: jest.fn(),
    getTextRecord: jest.fn(),
  })),
}));

describe('avatarUtils', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('generateJazzicon', () => {
    it('should generate a Jazzicon element for a valid address', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      const element = generateJazzicon(address, 32);
      
      expect(element).toBeInstanceOf(HTMLElement);
      expect(element.style.width).toBe('32px');
      expect(element.style.height).toBe('32px');
    });

    it('should handle invalid addresses gracefully', () => {
      const address = 'invalid-address';
      const element = generateJazzicon(address, 32);
      
      expect(element).toBeInstanceOf(HTMLElement);
      expect(element.style.backgroundColor).toBe('#f0f0f0');
    });
  });

  describe('hasExistingJazzicon', () => {
    it('should return false when no Jazzicon data exists', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      expect(hasExistingJazzicon(address)).toBe(false);
    });

    it('should return true when avatar data exists in localStorage', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      localStorage.setItem(`avatar_${address.toLowerCase()}`, 'some-avatar-data');
      expect(hasExistingJazzicon(address)).toBe(true);
    });

    it('should return true when Jazzicon seed exists in localStorage', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      localStorage.setItem(`jazzicon_${address.toLowerCase()}`, 'some-seed-data');
      expect(hasExistingJazzicon(address)).toBe(true);
    });

    it('should return true when address is in MetaMask history', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      localStorage.setItem('metamask_address_history', JSON.stringify([address.toLowerCase()]));
      expect(hasExistingJazzicon(address)).toBe(true);
    });

    it('should return true when MetaMask data exists for address', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      localStorage.setItem(`metamask_${address.toLowerCase()}`, 'some-metamask-data');
      expect(hasExistingJazzicon(address)).toBe(true);
    });

    it('should return true when transaction history exists for address', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      localStorage.setItem(`tx_history_${address.toLowerCase()}`, 'some-tx-data');
      expect(hasExistingJazzicon(address)).toBe(true);
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw an error
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => {
        throw new Error('localStorage error');
      });

      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      expect(hasExistingJazzicon(address)).toBe(false);

      // Restore original function
      localStorage.getItem = originalGetItem;
    });
  });
});
