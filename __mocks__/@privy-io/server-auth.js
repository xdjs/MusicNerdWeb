// Mock for @privy-io/server-auth
class PrivyClient {
  constructor(appId, appSecret) {
    this.appId = appId;
    this.appSecret = appSecret;
  }

  async verifyAuthToken(token) {
    return { userId: 'mock-privy-user-id' };
  }

  async getUser(userId) {
    return {
      id: userId,
      email: { address: 'test@example.com' },
      linkedAccounts: []
    };
  }
}

module.exports = { PrivyClient };
