// Mock for @rainbow-me/rainbowkit
module.exports = {
  ConnectButton: {
    Custom: ({ children }) => children({ mounted: true, openConnectModal: jest.fn() }),
  },
  useConnectModal: () => ({
    openConnectModal: jest.fn(),
  }),
  getDefaultWallets: () => [],
  getWalletConnectConnector: () => ({}),
  connectorsForWallets: () => [],
  RainbowKitProvider: ({ children }) => children,
  darkTheme: () => ({}),
  lightTheme: () => ({}),
  midnightTheme: () => ({}),
};
