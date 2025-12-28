// Manual mock for next-auth/providers/credentials
function CredentialsProvider(options) {
  return {
    id: options.id || 'credentials',
    name: options.name || 'Credentials',
    type: 'credentials',
    credentials: options.credentials || {},
    authorize: options.authorize || jest.fn(),
  };
}

module.exports = CredentialsProvider;
module.exports.default = CredentialsProvider;
