import { generateJazzicon, hasExistingJazzicon, getExistingJazziconSeed } from '../avatarUtils';

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
    it('should generate a Jazzicon element when existing seed is found', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      localStorage.setItem(`jazzicon_${address.toLowerCase()}`, '12345');
      
      const element = generateJazzicon(address, 32);
      
      expect(element).not.toBeNull();
      expect(element).toBeInstanceOf(HTMLElement);
      if (element) {
        expect(element.style.width).toBe('32px');
        expect(element.style.height).toBe('32px');
      }
    });

    it('should return null when no existing seed is found', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      const element = generateJazzicon(address, 32);
      
      expect(element).toBeNull();
    });

    it('should return null for invalid addresses', () => {
      const address = 'invalid-address';
      const element = generateJazzicon(address, 32);
      
      expect(element).toBeNull();
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

  describe('getExistingJazziconSeed', () => {
    it('should return null when no seed exists', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      expect(getExistingJazziconSeed(address)).toBeNull();
    });

    it('should return seed when jazzicon seed exists in localStorage', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      localStorage.setItem(`jazzicon_${address.toLowerCase()}`, '12345');
      expect(getExistingJazziconSeed(address)).toBe(12345);
    });

    it('should return seed when MetaMask data contains jazziconSeed', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      const metamaskData = { jazziconSeed: 67890 };
      localStorage.setItem(`metamask_${address.toLowerCase()}`, JSON.stringify(metamaskData));
      expect(getExistingJazziconSeed(address)).toBe(67890);
    });

    it('should return seed when cached seed exists', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      localStorage.setItem(`cached_jazzicon_seed_${address.toLowerCase()}`, '54321');
      expect(getExistingJazziconSeed(address)).toBe(54321);
    });

    it('should handle invalid seed values gracefully', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      localStorage.setItem(`jazzicon_${address.toLowerCase()}`, 'invalid-seed');
      expect(getExistingJazziconSeed(address)).toBeNull();
    });

    it('should handle localStorage errors gracefully', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => {
        throw new Error('localStorage error');
      });

      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      expect(getExistingJazziconSeed(address)).toBeNull();

      localStorage.getItem = originalGetItem;
    });
  });
});
