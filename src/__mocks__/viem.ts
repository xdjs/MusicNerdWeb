// Mock for viem module to handle ES module issues in Jest

export const createPublicClient = jest.fn().mockReturnValue({
  // Mock client methods
  readContract: jest.fn(),
  getBalance: jest.fn(),
  getBlockNumber: jest.fn(),
});

export const http = jest.fn().mockReturnValue({
  transport: 'http',
});

export const getEnsName = jest.fn().mockResolvedValue(null);
export const getEnsAvatar = jest.fn().mockResolvedValue(null);

// Mock other viem exports as needed
export const parseEther = jest.fn();
export const formatEther = jest.fn();

// Mock chains
export const mainnet = {
  id: 1,
  name: 'Ethereum',
  network: 'homestead',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://cloudflare-eth.com'] },
    public: { http: ['https://cloudflare-eth.com'] },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://etherscan.io' },
  },
  testnet: false,
};
