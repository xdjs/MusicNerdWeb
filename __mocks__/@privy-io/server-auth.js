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
    // Handle object parameter (for identity token verification)
    let id;
    if (typeof userId === 'object') {
      id = userId.idToken || userId.userId || 'mock-privy-user-id';
    } else {
      id = userId;
    }
    return {
      id: id,
      email: { address: 'test@example.com' },
      linkedAccounts: []
    };
  }
}

module.exports = { PrivyClient };
