// Mock for wagmi module to handle ES module issues in Jest

// Mock the useAccount hook
export const useAccount = jest.fn().mockReturnValue({
  address: '0x1234567890123456789012345678901234567890',
  connector: { name: 'Mock Connector' },
  isConnected: true,
});

// Mock the useConnect hook
export const useConnect = jest.fn().mockReturnValue({
  connect: jest.fn(),
  connectors: [],
  error: null,
  isLoading: false,
  pendingConnector: null,
});

// Mock the useDisconnect hook
export const useDisconnect = jest.fn().mockReturnValue({
  disconnect: jest.fn(),
});

// Mock other commonly used wagmi hooks
export const useBalance = jest.fn().mockReturnValue({
  data: { formatted: '0', symbol: 'ETH' },
  isLoading: false,
});

export const useEnsName = jest.fn().mockReturnValue({
  data: null,
  isLoading: false,
});

export const useEnsAvatar = jest.fn().mockReturnValue({
  data: null,
  isLoading: false,
});

// Mock WagmiConfig
export const WagmiConfig = ({ children }: { children: React.ReactNode }) => children;

// Mock createConfig
export const createConfig = jest.fn();

// Mock chains
export * from './wagmi-chains';
