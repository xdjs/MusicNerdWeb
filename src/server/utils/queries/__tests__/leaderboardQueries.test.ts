import { db } from '@/server/db/drizzle';
import { getLeaderboard } from '../getLeaderboard';
import { getLeaderboardInRange } from '../getLeaderboardInRange';

jest.mock('@/server/auth', () => ({ getServerAuthSession: jest.fn() }));
jest.mock('../userQueries', () => ({ getUserByWallet: jest.fn() }));

const row = (userId: string, ugcCount: number, artistsCount: number, isHidden = false) => ({
    userId, wallet: userId, username: userId, email: null, ugcCount, artistsCount, isHidden,
});

const queryCases = [
    ['all time', () => getLeaderboard()],
    ['selected period', () => getLeaderboardInRange('2026-09-15T00:00:00Z', '2026-09-15T23:59:59Z')],
] as const;

describe.each(queryCases)('%s leaderboard eligibility', (_name, query) => {
    it('drops inactive accounts and preserves single-type contributions and hidden handling', async () => {
        const eligible = [row('ugc-only', 2, 0), row('artist-only', 0, 1), row('hidden-active', 1, 0, true)];
        jest.mocked(db.execute).mockResolvedValueOnce([
            ...eligible, row('never-active', 0, 0), row('hidden-inactive', 0, 0, true),
        ] as never);
        expect(await query()).toEqual(eligible);
    });

    it('returns an empty list when every count is zero', async () => {
        jest.mocked(db.execute).mockResolvedValueOnce([row('never-active', 0, 0)] as never);
        expect(await query()).toEqual([]);
    });
});

it('excludes a historical contributor from an inactive period but keeps their all-time entry', async () => {
    jest.mocked(db.execute)
        .mockResolvedValueOnce([row('historical', 0, 0)] as never)
        .mockResolvedValueOnce([row('historical', 1, 0)] as never);
    expect(await getLeaderboardInRange('2026-09-15T00:00:00Z', '2026-09-15T23:59:59Z')).toEqual([]);
    expect(await getLeaderboard()).toEqual([row('historical', 1, 0)]);
});
