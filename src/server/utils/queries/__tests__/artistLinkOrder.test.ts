import { db } from '@/server/db/drizzle';
import { saveArtistLinkOrder } from '../artistLinkOrder';
import { withArtistOperation } from '@/server/utils/artistOperationContext';

function setup(claimId = 'claim-1') {
    const where = jest.fn().mockResolvedValue([]);
    const set = jest.fn(() => ({ where }));
    const tx = {
        execute: jest.fn().mockResolvedValue([]),
        query: {
            artists: { findFirst: jest.fn().mockResolvedValue({ id: 'a1', linkOrder: { support: ['subvert', 'bandcamp'] } }) },
            artistClaims: { findFirst: jest.fn().mockResolvedValue({ id: claimId, userId: 'owner' }) },
            users: { findFirst: jest.fn() },
        },
        update: jest.fn(() => ({ set })),
    };
    (db.transaction as jest.Mock) = jest.fn(callback => callback(tx));
    return { tx, set };
}
test('updates one section while preserving the other inside an authorized locked transaction', async () => {
    const { tx, set } = setup();
    await withArtistOperation('a1', { userId: 'owner', expectedClaimId: 'claim-1' }, () => saveArtistLinkOrder('a1', 'links', ['deezer', 'spotify']));
    expect(set).toHaveBeenCalledWith({ linkOrder: { support: ['subvert', 'bandcamp'], links: ['deezer', 'spotify'] } });
    expect(tx.execute.mock.invocationCallOrder[0]).toBeLessThan(tx.query.artists.findFirst.mock.invocationCallOrder[0]);
});
test('does not persist a stale owner request', async () => {
    const { set } = setup('replacement-claim');
    await expect(withArtistOperation('a1', { userId: 'owner', expectedClaimId: 'claim-1' }, () => saveArtistLinkOrder('a1', 'links', ['spotify']))).rejects.toThrow('ownership changed');
    expect(set).not.toHaveBeenCalled();
});
