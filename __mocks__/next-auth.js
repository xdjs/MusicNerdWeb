// Mock for next-auth/react
const mockSession = {
  user: {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    image: 'https://example.com/avatar.jpg',
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

const useSession = jest.fn(() => ({
  data: mockSession,
  status: 'authenticated',
  update: jest.fn(),
}));

const getSession = jest.fn(() => Promise.resolve(mockSession));

const signIn = jest.fn(() => Promise.resolve({ ok: true, error: null }));

const signOut = jest.fn(() => Promise.resolve({ ok: true }));

const getServerSession = jest.fn(() => Promise.resolve(mockSession));

const SessionProvider = ({ children }) => children;

module.exports = {
  useSession,
  getSession,
  signIn,
  signOut,
  getServerSession,
  SessionProvider,
};
