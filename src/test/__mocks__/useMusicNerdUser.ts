import type { MusicNerdUser } from '../../hooks/useMusicNerdUser';

/** The signed-in account every component test sees unless it sets its own. */
export const mockMusicNerdUser: MusicNerdUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'Test User',
    usernameNeedsConfirmation: false,
    usernamePromptedAt: null,
    wallet: null,
    privyUserId: 'did:privy:test',
    createdAt: '2026-10-01 12:00:00+00',
    updatedAt: '2026-10-01 12:00:00+00',
    legacyId: null,
    isAdmin: false,
    isWhiteListed: false,
    isSuperAdmin: false,
    isHidden: false,
    legacyLinkDismissed: false,
    acceptedUgcCount: 0,
    needsLegacyLink: false,
};

export const useMusicNerdUser = jest.fn(() => ({
    user: mockMusicNerdUser as MusicNerdUser | null,
    status: 'authenticated' as 'loading' | 'authenticated' | 'unauthenticated',
    isError: false,
    refetch: jest.fn(() => Promise.resolve({})),
}));
