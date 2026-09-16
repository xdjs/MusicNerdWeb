// @ts-nocheck
import { jest } from '@jest/globals';
import { PgDialect } from 'drizzle-orm/pg-core';

jest.mock('@/server/db/drizzle', () => ({ db: { select: jest.fn(), transaction: jest.fn() } }));

const USER = '11111111-1111-4111-8111-111111111111';
const LEGACY = '22222222-2222-4222-8222-222222222222';
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const date = '2026-09-06T12:00:00Z';
const stored = (artistId: string) => ({ artistId, createdAt: date });
const view = (artistId: string) => ({ artistId, artistName: `Artist ${artistId}`, imageUrl: null });
const dialect = new PgDialect();

async function setup(results: unknown[][]) {
    const { db } = await import('@/server/db/drizzle');
    const queries = await import('../bookmarkQueries');
    const locks: string[] = [];
    const conditions: unknown[] = [];
    const inserted: unknown[] = [];
    const updates: unknown[] = [];
    const deleted: unknown[] = [];
    const tx = {
        select: jest.fn(() => {
            const rows = results.shift() ?? [];
            const query = {
                from: jest.fn(() => query), innerJoin: jest.fn(() => query),
                where: jest.fn((condition) => { conditions.push(dialect.sqlToQuery(condition)); return query; }),
                orderBy: jest.fn(() => query),
                for: jest.fn((kind) => { locks.push(kind); return Promise.resolve(rows); }),
                then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
            };
            return query;
        }),
        insert: jest.fn(() => ({ values: (rows) => {
            inserted.push(...rows);
            return { onConflictDoNothing: jest.fn().mockResolvedValue([]), onConflictDoUpdate: jest.fn().mockResolvedValue([]) };
        } })),
        update: jest.fn(() => ({ set: (values) => ({ where: (condition) => {
            if (values.removedAt) deleted.push(dialect.sqlToQuery(condition));
            else updates.push({ values: dialect.sqlToQuery(values.position), condition: dialect.sqlToQuery(condition) });
            return Promise.resolve([]);
        } }) })),
        delete: jest.fn(() => ({ where: (condition) => {
            deleted.push(dialect.sqlToQuery(condition)); return Promise.resolve([]);
        } })),
    };
    db.select.mockImplementation(tx.select);
    db.transaction.mockImplementation(async (fn) => fn(tx));
    return { ...queries, tx, locks, conditions, inserted, updates, deleted };
}

describe('account bookmarks', () => {
    beforeEach(() => { jest.resetModules(); jest.clearAllMocks(); });

    it('joins current artist names and only safe stored images for the requested owner', async () => {
        const { getUserBookmarks, conditions } = await setup([[
            { artistId: A, artistName: 'Current name', imageUrl: '/uploaded.png' },
            { artistId: B, artistName: null, imageUrl: 'javascript:alert(1)' },
            { artistId: C, artistName: 'Third', imageUrl: '//other.test/picture' },
        ]]);
        expect(await getUserBookmarks(USER)).toEqual([
            { artistId: A, artistName: 'Current name', imageUrl: '/uploaded.png' },
            { artistId: B, artistName: 'Unknown Artist', imageUrl: null },
            { artistId: C, artistName: 'Third', imageUrl: null },
        ]);
        expect(conditions[0].params).toEqual([USER]);
    });

    it('locks the account, prepends only missing existing artists, and preserves import order', async () => {
        const { addUserBookmarks, inserted, updates, locks } = await setup([
            [{ id: USER }], [stored(A)], [{ id: C }, { id: B }], [view(B), view(C), view(A)],
        ]);
        const nonexistent = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
        expect(await addUserBookmarks(USER, [B, A, C, B, nonexistent])).toEqual([view(B), view(C), view(A)]);
        expect(locks).toEqual(['update']);
        expect(inserted).toEqual([{ userId: USER, artistId: B, position: 0 }, { userId: USER, artistId: C, position: 1 }]);
        expect(updates[0].values.params).toEqual([B, 0, C, 1, A, 2]);
        expect(updates[0].condition.params).toEqual([USER, B, C, A]);
    });

    it('uses only a known numeric Deezer ID for a stable image fallback', async () => {
        const { getUserBookmarks } = await setup([[
            { ...view(A), deezer: '27' }, { ...view(B), deezer: '../search' },
        ]]);
        expect((await getUserBookmarks(USER)).map(({ imageUrl }) => imageUrl)).toEqual([
            'https://api.deezer.com/artist/27/image?size=medium', null,
        ]);
    });

    it('repeated adds are idempotent and do not move an existing bookmark', async () => {
        const { addUserBookmarks, inserted, updates } = await setup([[{ id: USER }], [stored(B), stored(A)], [view(B), view(A)]]);
        expect(await addUserBookmarks(USER, [A, A])).toEqual([view(B), view(A)]);
        expect(inserted).toEqual([]);
        expect(updates).toEqual([]);
    });

    it('stale reorders retain concurrently added entries and cannot resurrect removed entries', async () => {
        const { editUserBookmarks, inserted, updates, deleted } = await setup([
            [{ id: USER }], [stored(C), stored(A)], [view(C), view(A)],
        ]);
        expect(await editUserBookmarks(USER, [B, A], [B])).toEqual([view(C), view(A)]);
        expect(inserted).toEqual([]);
        expect(deleted[0].params).toEqual([USER, B]);
        expect(updates[0].values.params).toEqual([C, 0, A, 1]);
    });

    it('removing an already absent bookmark leaves surviving entries intact', async () => {
        const { removeUserBookmark, deleted } = await setup([[{ id: USER }], [stored(A)], [view(A)]]);
        expect(await removeUserBookmark(USER, B)).toEqual([view(A)]);
        expect(deleted[0].params).toEqual([USER, B]);
    });

    it('does not write for an account removed since the session was issued', async () => {
        const { addUserBookmarks, inserted, updates } = await setup([[]]);
        await expect(addUserBookmarks(USER, [A])).rejects.toThrow('Bookmark account no longer exists');
        expect(inserted).toEqual([]);
        expect(updates).toEqual([]);
    });

    it('locks both merging account rows in a stable order', async () => {
        const { lockBookmarkUsers, tx, conditions, locks } = await setup([[{ id: USER }, { id: LEGACY }]]);
        await lockBookmarkUsers(tx, [LEGACY, USER]);
        expect(conditions[0].params).toEqual([USER, LEGACY]);
        expect(locks).toEqual(['update']);
    });

    it('merges bookmark union with target order and creation times preserved', async () => {
        const { transferUserBookmarks, tx, inserted, updates } = await setup([
            [stored(B), stored(A)], [stored(A), stored(C)],
        ]);
        await transferUserBookmarks(tx, USER, LEGACY);
        expect(inserted).toEqual([{ userId: LEGACY, artistId: C, createdAt: date, removedAt: undefined, position: 2 }]);
        expect(updates[0].values.params).toEqual([B, 0, A, 1, C, 2]);
        expect(updates[0].condition.params).toEqual([LEGACY, B, A, C]);
    });
});
