import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Page from '../page';

// Mock next-auth
jest.mock('next-auth/react', () => ({
    useSession: jest.fn(),
    SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Helper function to create a mock response
const createMockResponse = (data: any) => ({
    ok: true,
    json: async () => data,
} as Response);

describe('UGC Stats Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset environment variables for each test
        delete process.env.NEXT_PUBLIC_DISABLE_WALLET_REQUIREMENT;
        
        // Set up a default fetch mock that returns empty data
        mockFetch.mockImplementation(() => Promise.resolve(createMockResponse([])));
    });

    it('should show dashboard when not authenticated', async () => {
        // Mock useSession to return unauthenticated
        const { useSession } = require('next-auth/react');
        useSession.mockReturnValue({
            status: 'unauthenticated',
            data: null,
        });

        // Mock all API calls
        mockFetch
            .mockResolvedValueOnce(createMockResponse([])) // /api/recentEdited
            .mockResolvedValueOnce(createMockResponse({ ugcCount: 0, artistsCount: 0 })) // /api/ugcCount
            .mockResolvedValueOnce(createMockResponse([])) // /api/leaderboard
            .mockResolvedValueOnce(createMockResponse({ entries: [], total: 0, pageCount: 0 })); // /api/userEntries

        render(<Page />);

        // Wait for loading to complete and then check for dashboard content
        await waitFor(() => {
            expect(screen.getByText('User Profile')).toBeInTheDocument();
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

        // Mock all API calls
        mockFetch
            .mockResolvedValueOnce(createMockResponse([])) // /api/recentEdited
            .mockResolvedValueOnce(createMockResponse({ ugcCount: 0, artistsCount: 0 })) // /api/ugcCount
            .mockResolvedValueOnce(createMockResponse([])) // /api/leaderboard
            .mockResolvedValueOnce(createMockResponse({ entries: [], total: 0, pageCount: 0 })); // /api/userEntries

        render(<Page />);

        // Wait for loading to complete and then check for dashboard content
        await waitFor(() => {
            expect(screen.getByText('User Profile')).toBeInTheDocument();
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

        // Mock all API calls with more specific implementations
        mockFetch
            .mockResolvedValueOnce(createMockResponse(mockUser)) // /api/user/[id]
            .mockResolvedValueOnce(createMockResponse({ ugcCount: 0, artistsCount: 0 })) // /api/ugcCount (markUGCSeen)
            .mockResolvedValueOnce(createMockResponse({ ugcCount: 0, artistsCount: 0 })) // /api/ugcStats (fetchAllTimeStats)
            .mockResolvedValueOnce(createMockResponse([])) // /api/leaderboard (fetchRank)
            .mockResolvedValueOnce(createMockResponse([])) // /api/recentEdited
            .mockResolvedValueOnce(createMockResponse({ entries: [], total: 0, pageCount: 0 })) // /api/userEntries
            .mockResolvedValueOnce(createMockResponse({ entries: [], total: 0, pageCount: 0 })) // Additional /api/userEntries call
            .mockResolvedValueOnce(createMockResponse({ entries: [], total: 0, pageCount: 0 })); // Another /api/userEntries call

        render(<Page />);

        // Wait for loading to complete and then check for dashboard content
        await waitFor(() => {
            // Check for any text that should be present in the dashboard
            expect(screen.getByText('Role:')).toBeInTheDocument();
        });
    });
}); 