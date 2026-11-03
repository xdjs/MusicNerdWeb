import '@testing-library/jest-dom';
import { describe, it, expect } from '@jest/globals';

// Mock environment variables
Object.defineProperty(process, 'env', {
    value: {
        ...process.env,
        NEXT_PUBLIC_SPOTIFY_WEB_CLIENT_ID: 'test_client_id',
        SPOTIFY_WEB_CLIENT_SECRET: 'test_client_secret',
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