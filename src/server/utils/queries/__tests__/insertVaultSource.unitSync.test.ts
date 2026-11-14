// @ts-nocheck
import { jest } from '@jest/globals';

const queueUnitSync = jest.fn();
jest.mock('@/server/utils/units/queueUnitSync', () => ({ queueUnitSync: (...a) => queueUnitSync(...a) }));
jest.mock('@/server/utils/activity/recordArtistActivity', () => ({ recordArtistActivity: jest.fn().mockResolvedValue('activity-1') }));
jest.mock('@/server/utils/source/queueApprovedSourceExtraction', () => ({ queueApprovedSourceExtraction: jest.fn() }));

let committed;
async function load(inserted = true) {
    jest.resetModules();
    committed = false;
    const values = jest.fn().mockReturnValue({ onConflictDoNothing: () => ({ returning: async () => (inserted ? [{ id: 's1', artistId: 'a1' }] : []) }) });
    const tx = { insert: () => ({ values }), execute: jest.fn().mockResolvedValue([]) };
    jest.doMock('@/server/db/drizzle', () => ({ db: { transaction: async fn => { const out = await fn(tx); committed = true; return out; } } }));
    queueUnitSync.mockReset().mockImplementation(async () => { expect(committed).toBe(true); return true; });
    return (await import('../insertVaultSource')).insertVaultSource;
}

it('queues a unit sync after committing a source inserted already approved', async () => {
    const insertVaultSource = await load();
    const row = await insertVaultSource({ artistId: 'a1', url: 'https://x.test/a', status: 'approved' });
    expect(row.id).toBe('s1');
    expect(queueUnitSync).toHaveBeenCalledTimes(1);
    expect(queueUnitSync).toHaveBeenCalledWith('a1');
});
it('does not queue for a pending insert', async () => {
    const insertVaultSource = await load();
    await insertVaultSource({ artistId: 'a1', url: 'https://x.test/a' });
    expect(queueUnitSync).not.toHaveBeenCalled();
});
it('does not queue when the row already existed', async () => {
    const insertVaultSource = await load(false);
    expect(await insertVaultSource({ artistId: 'a1', url: 'https://x.test/a', status: 'approved' })).toBeUndefined();
    expect(queueUnitSync).not.toHaveBeenCalled();
});
it('returns the same result when the hook fails', async () => {
    const insertVaultSource = await load();
    queueUnitSync.mockRejectedValueOnce(new Error('boom'));
    const row = await insertVaultSource({ artistId: 'a1', url: 'https://x.test/a', status: 'approved' });
    expect(row.id).toBe('s1');
});
