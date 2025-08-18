import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Page from '../page';

// Mock next-auth
jest.mock('next-auth/react', () => ({
    useSession: jest.fn(),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock the user API endpoint
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('UGC Stats Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset environment variables for each test
        delete process.env.NEXT_PUBLIC_DISABLE_WALLET_REQUIREMENT;
    });

    it('should show dashboard when not authenticated', async () => {
        // Mock useSession to return unauthenticated
        const { useSession } = require('next-auth/react');
        useSession.mockReturnValue({
            status: 'unauthenticated',
            data: null,
        });

        // Mock fetch to return empty user entries
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                entries: [],
                total: 0,
                pageCount: 0,
            }),
        } as Response);

        render(<Page />);

        // Wait for loading to complete and then check for dashboard content
        await waitFor(() => {
            expect(screen.getByText('Guest User')).toBeInTheDocument();
        });
    });

    it('should show dashboard when walletless mode is enabled', async () => {
        // Enable walletless mode
        process.env.NEXT_PUBLIC_DISABLE_WALLET_REQUIREMENT = 'true';
        
        // Mock useSession to return unauthenticated
        const { useSession } = require('next-auth/react');
        useSession.mockReturnValue({
            status: 'unauthenticated',
            data: null,
        });

        // Mock fetch to return empty user entries
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                entries: [],
                total: 0,
                pageCount: 0,
            }),
        } as Response);

        render(<Page />);

        // Wait for loading to complete and then check for dashboard content
        await waitFor(() => {
            expect(screen.getByText('Guest User')).toBeInTheDocument();
        });
    });

    it('should show dashboard when authenticated', async () => {
        const mockSession = {
            user: {
                id: 'test-user-id',
                walletAddress: '0x123...',
                email: 'test@example.com',
                name: 'Test User',
            }
        };

        const mockUser = {
            id: 'test-user-id',
            wallet: '0x123...',
            email: 'test@example.com',
            username: 'Test User',
            isAdmin: false,
            isWhiteListed: false,
            isSuperAdmin: false,
            isHidden: false,
            acceptedUgcCount: null,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
            legacyId: null
        };

        // Mock useSession to return authenticated
        const { useSession } = require('next-auth/react');
        useSession.mockReturnValue({
            status: 'authenticated',
            data: mockSession,
        });

        // Mock fetch to return user data and empty user entries
        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockUser,
            } as Response)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    entries: [],
                    total: 0,
                    pageCount: 0,
                }),
            } as Response);

        render(<Page />);

        // Wait for loading to complete and then check for dashboard content
        await waitFor(() => {
            expect(screen.getByText('Test User')).toBeInTheDocument();
        });
    });
}); 