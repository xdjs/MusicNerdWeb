// Mock viem module
const mockViem = {
  // Chains
  mainnet: { id: 1, name: 'Ethereum' },
  polygon: { id: 137, name: 'Polygon' },
  arbitrum: { id: 42161, name: 'Arbitrum One' },
  optimism: { id: 10, name: 'Optimism' },
  base: { id: 8453, name: 'Base' },
  
  // Utilities
  formatEther: jest.fn((value) => value.toString()),
  parseEther: jest.fn((value) => BigInt(value)),
  formatUnits: jest.fn((value, decimals) => value.toString()),
  parseUnits: jest.fn((value, decimals) => BigInt(value)),
  
  // Address utilities
  getAddress: jest.fn((address) => address),
  isAddress: jest.fn((address) => /^0x[a-fA-F0-9]{40}$/.test(address)),
  
  // Hash utilities
  keccak256: jest.fn((data) => '0x' + '0'.repeat(64)),
  hashMessage: jest.fn((message) => '0x' + '0'.repeat(64)),
  hashTypedData: jest.fn((data) => '0x' + '0'.repeat(64)),
  
  // Signature utilities
  recoverAddress: jest.fn((hash, signature) => '0x' + '0'.repeat(40)),
  recoverPublicKey: jest.fn((hash, signature) => '0x' + '0'.repeat(130)),
  verifyMessage: jest.fn((message, signature) => '0x' + '0'.repeat(40)),
  verifyTypedData: jest.fn((data, signature) => '0x' + '0'.repeat(40)),
  
  // Contract utilities
  encodeFunctionData: jest.fn((abi, functionName, args) => '0x'),
  decodeFunctionData: jest.fn((abi, data) => ({ functionName: 'mock', args: [] })),
  encodeFunctionResult: jest.fn((abi, functionName, result) => '0x'),
  decodeFunctionResult: jest.fn((abi, functionName, data) => ({})),
  
  // ENS utilities
  getEnsAddress: jest.fn(() => Promise.resolve(null)),
  getEnsName: jest.fn(() => Promise.resolve(null)),
  getEnsAvatar: jest.fn(() => Promise.resolve(null)),
  getEnsResolver: jest.fn(() => Promise.resolve(null)),
  getEnsText: jest.fn(() => Promise.resolve(null)),
  
  // Block utilities
  getBlock: jest.fn(() => Promise.resolve({})),
  getBlockNumber: jest.fn(() => Promise.resolve(0n)),
  getBlockTransactionCount: jest.fn(() => Promise.resolve(0n)),
  
  // Transaction utilities
  getTransaction: jest.fn(() => Promise.resolve({})),
  getTransactionReceipt: jest.fn(() => Promise.resolve({})),
  waitForTransactionReceipt: jest.fn(() => Promise.resolve({})),
  
  // Balance utilities
  getBalance: jest.fn(() => Promise.resolve(0n)),
  
  // Gas utilities
  estimateGas: jest.fn(() => Promise.resolve(0n)),
  getGasPrice: jest.fn(() => Promise.resolve(0n)),
  getFeeHistory: jest.fn(() => Promise.resolve({})),
  
  // Log utilities
  getLogs: jest.fn(() => Promise.resolve([])),
  
  // Storage utilities
  getStorageAt: jest.fn(() => Promise.resolve('0x')),
  
  // Code utilities
  getCode: jest.fn(() => Promise.resolve('0x')),
  
  // Chain utilities
  getChainId: jest.fn(() => Promise.resolve(1)),
  
  // Multicall utilities
  multicall: jest.fn(() => Promise.resolve([])),
  
  // Contract creation
  createPublicClient: jest.fn(() => ({})),
  createWalletClient: jest.fn(() => ({})),
  createTestClient: jest.fn(() => ({})),
  
  // Transport
  http: jest.fn(() => ({})),
  webSocket: jest.fn(() => ({})),
  
  // Serialization
  serializeTransaction: jest.fn(() => '0x'),
  deserializeTransaction: jest.fn(() => ({})),
  
  // Validation
  validateAddress: jest.fn(() => true),
  validateChainId: jest.fn(() => true),
  
  // Constants
  zeroAddress: '0x0000000000000000000000000000000000000000',
  zeroHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
  
  // Types (for TypeScript)
  type: {
    Address: 'string',
    Hex: 'string',
    Hash: 'string',
    LogTopic: 'string',
    Quantity: 'bigint',
    BlockNumber: 'bigint',
    BlockTag: 'string',
    BlockIdentifier: 'string',
    BlockNumberOrTag: 'string',
    BlockIdentifierOrTag: 'string',
    BlockNumberOrTagOrHash: 'string',
    BlockIdentifierOrTagOrHash: 'string',
  }
};

module.exports = mockViem;
