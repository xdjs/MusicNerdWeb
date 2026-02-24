// Mock for next-auth/next
import { Session } from 'next-auth';

const mockSession: Session = {
    user: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://example.com/avatar.jpg',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

export const getServerSession = jest.fn(() => Promise.resolve(mockSession));

const NextAuth = jest.fn(() => ({
    GET: jest.fn(),
    POST: jest.fn(),
}));

export default NextAuth;
