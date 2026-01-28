// Mock for @privy-io/react-auth
const React = require('react');

const usePrivy = () => ({
  ready: true,
  authenticated: false,
  user: null,
  getAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
});

const useLogin = ({ onComplete, onError } = {}) => ({
  login: jest.fn(),
});

const useLogout = ({ onSuccess } = {}) => ({
  logout: jest.fn(),
});

const useLinkAccount = ({ onSuccess, onError } = {}) => ({
  linkWallet: jest.fn(),
});

const useIdentityToken = () => ({
  identityToken: 'mock-identity-token',
});

const getIdentityToken = jest.fn().mockResolvedValue('mock-identity-token');

const PrivyProvider = ({ children }) => children;

module.exports = {
  usePrivy,
  useLogin,
  useLogout,
  useLinkAccount,
  useIdentityToken,
  getIdentityToken,
  PrivyProvider,
};
