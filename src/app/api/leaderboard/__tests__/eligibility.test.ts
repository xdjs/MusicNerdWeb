import { db } from '@/server/db/drizzle';
import { GET } from '../route';

// Match the existing route test's Response.json polyfill for JSDOM.
if (!('json' in Response)) {
    Object.defineProperty(Response, 'json', { value: (data: unknown, init?: ResponseInit) =>
        new Response(JSON.stringify(data), {
            ...init, headers: { 'Content-Type': 'application/json', ...init?.headers },
        }), configurable: true });
}

// Exercise the real query helpers and handler; only database I/O is replaced.
const row = (userId: string, ugcCount: number, artistsCount: number) => ({
    userId, wallet: null, username: userId, email: null, ugcCount, artistsCount, isHidden: false,
});
const eligible = [row('ugc-only', 2, 0), row('artist-only', 0, 1)];

for (const period of ['', '&from=2026-09-15T00:00:00Z&to=2026-09-15T23:59:59Z']) {
    describe(period ? 'date-range API' : 'all-time API', () => {
        it('filters before pagination and total calculation', async () => {
            for (const page of [1, 2, 3]) {
                jest.mocked(db.execute).mockResolvedValueOnce([
                    ...eligible, row('never-active', 0, 0), row('inactive-in-period', 0, 0),
                ] as never);
                const response = await GET(new Request(`http://localhost/api/leaderboard?page=${page}&perPage=1${period}`));
                expect(response.status).toBe(200);
                expect(await response.json()).toEqual({
                    entries: eligible.slice(page - 1, page), total: 2, pageCount: 2,
                });
            }
        });

        it('returns zero totals for an empty period', async () => {
            jest.mocked(db.execute).mockResolvedValueOnce([row('inactive', 0, 0)] as never);
            const response = await GET(new Request(`http://localhost/api/leaderboard?page=1${period}`));
            expect(await response.json()).toEqual({ entries: [], total: 0, pageCount: 0 });
        });

        it('filters the legacy unpaginated response too', async () => {
            jest.mocked(db.execute).mockResolvedValueOnce([...eligible, row('inactive', 0, 0)] as never);
            const response = await GET(new Request(`http://localhost/api/leaderboard?${period}`));
            expect(await response.json()).toEqual(eligible);
        });
    });
}

it.each([
    '', '?page=1&perPage=10',
    '?from=2026-09-15T00:00:00Z&to=2026-09-15T23:59:59Z',
])('protects pending names and private account fields in public responses %s', async query => {
    jest.mocked(db.execute).mockResolvedValueOnce([
        { ...row('email-backed', 1, 0), username: 'private@example.test', email: 'private@example.test' },
        { ...row('wallet-backed', 1, 0), username: ' 0xAbC ', wallet: '0xabc' },
        { ...row('chosen', 1, 0), username: 'Aux Bandit', email: 'private@example.test', wallet: '0xabc' },
    ] as never);
    const response = await GET(new Request(`http://localhost/api/leaderboard${query}`));
    const data = await response.json();
    const entries = Array.isArray(data) ? data : data.entries;
    expect(entries.map((entry: { username: string }) => entry.username)).toEqual(['Anonymous', 'Anonymous', 'Aux Bandit']);
    expect(entries.every((entry: { email: null; wallet: null }) => entry.email === null && entry.wallet === null)).toBe(true);
});
