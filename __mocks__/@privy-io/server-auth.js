// Manual mock for @privy-io/server-auth
const mockPrivyClient = function(appId, appSecret) {
  return {
    verifyAuthToken: jest.fn().mockResolvedValue({ userId: 'test-privy-user-id' }),
    getUser: jest.fn().mockResolvedValue({
      id: 'test-privy-user-id',
      linkedAccounts: [],
    }),
  };
};

module.exports = {
  PrivyClient: mockPrivyClient,
};
