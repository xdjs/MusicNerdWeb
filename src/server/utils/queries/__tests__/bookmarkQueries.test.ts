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

    it('rejects an account removed since the session was issued', async () => {
        const { lockBookmarkUsers, tx } = await setup([[{ id: USER }]]);
        await expect(lockBookmarkUsers(tx, [USER, LEGACY])).rejects.toThrow('Bookmark account no longer exists');
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
