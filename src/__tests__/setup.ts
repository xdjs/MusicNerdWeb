import '@testing-library/jest-dom';
import { describe, it, expect } from '@jest/globals';

// Mock environment variables
Object.defineProperty(process, 'env', {
    value: {
        ...process.env,
        NEXT_PUBLIC_SPOTIFY_WEB_CLIENT_ID: 'test_client_id',
        SPOTIFY_WEB_CLIENT_SECRET: 'test_client_secret',
        NEXTAUTH_SECRET: 'test_secret',
        NEXTAUTH_URL: 'http://localhost:3000',
        NEXT_PUBLIC_DISABLE_WALLET_REQUIREMENT: 'true',
        NEXT_PUBLIC_PRIVY_APP_ID: 'test_privy_app_id',
        PRIVY_APP_SECRET: 'test_privy_app_secret',
        NODE_ENV: 'test'
    }
});

// Mock next/headers since it's not available in test environment
jest.mock('next/headers', () => ({
    cookies: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
    })),
    headers: jest.fn(),
}));

// Mock Privy React SDK
jest.mock('@privy-io/react-auth', () => ({
    usePrivy: jest.fn(() => ({
        ready: true,
        authenticated: false,
        user: null,
        logout: jest.fn(),
        getAccessToken: jest.fn().mockResolvedValue(null),
    })),
    useLogin: jest.fn(() => ({
        login: jest.fn(),
    })),
    useLinkAccount: jest.fn(() => ({
        linkWallet: jest.fn(),
    })),
    PrivyProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Privy Server SDK
jest.mock('@privy-io/server-auth', () => ({
    PrivyClient: jest.fn().mockImplementation(() => ({
        verifyAuthToken: jest.fn().mockResolvedValue({ userId: 'test-privy-user-id' }),
        getUser: jest.fn().mockResolvedValue({
            id: 'test-privy-user-id',
            linkedAccounts: [],
        }),
    })),
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
    useSession: jest.fn(() => ({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
    })),
    signIn: jest.fn(),
    signOut: jest.fn(),
    SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock next-auth package to avoid ESM issues
jest.mock('next-auth', () => ({
    default: jest.fn(),
    getServerSession: jest.fn(),
}));

// Mock next-auth/jwt
jest.mock('next-auth/jwt', () => ({
    getToken: jest.fn(),
    encode: jest.fn(),
    decode: jest.fn(),
}));

// Mock auth options
jest.mock('@/server/auth', () => ({
    authOptions: {
        providers: [
            {
                id: 'privy',
                name: 'Privy',
                credentials: {
                    authToken: { label: 'Auth Token', type: 'text' }
                },
                authorize: jest.fn()
            }
        ],
        session: {
            strategy: 'jwt',
            maxAge: 30 * 24 * 60 * 60,
        },
        callbacks: {
            jwt: jest.fn(),
            session: jest.fn(),
        },
    },
    getServerAuthSession: jest.fn().mockResolvedValue(null),
}));

// Reset all mocks before each test
beforeEach(() => {
    jest.clearAllMocks();
});

describe('Test Environment Setup', () => {
    it('should have proper environment variables', () => {
        expect(process.env.NODE_ENV).toBeDefined();
    });

    it('should have proper global mocks', () => {
        expect(global.fetch).toBeDefined();
        expect(global.Request).toBeDefined();
        expect(global.Response).toBeDefined();
    });
}); 