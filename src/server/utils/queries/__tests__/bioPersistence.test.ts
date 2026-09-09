// @ts-nocheck
import { jest } from '@jest/globals';

describe('persistArtistBio', () => {
    beforeEach(() => { jest.resetModules(); });
    async function setup({ bio = 'Artist edited bio', pinned = false } = {}) {
        const { db } = await import('@/server/db/drizzle');
        const values = jest.fn().mockResolvedValue(undefined);
        const set = jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });
        const tx = {
            execute: jest.fn().mockResolvedValue([]),
            query: {
                artists: { findFirst: jest.fn().mockResolvedValue({ id: 'a1', bio }) },
                artistBioVersions: { findFirst: jest.fn().mockResolvedValueOnce(pinned ? { bioText: bio } : undefined).mockResolvedValue(undefined) },
            },
            insert: jest.fn(() => ({ values })), update: jest.fn(() => ({ set })),
        };
        db.transaction = jest.fn(fn => fn(tx));
        const { persistArtistBio } = await import('../bioPersistence');
        return { persistArtistBio, tx, set, values };
    }
    it('never overwrites a pin, even when generation started before the pin', async () => {
        const { persistArtistBio, set, values } = await setup({ pinned: true });
        await expect(persistArtistBio('a1', 'AI replacement', { generated: true, expectedBio: 'Artist edited bio' })).rejects.toThrow('changed or was pinned');
        expect(set).not.toHaveBeenCalled();
        expect(values).not.toHaveBeenCalled();
    });
    it('requires explicit unpin before manual editing', async () => {
        const { persistArtistBio, set } = await setup({ pinned: true });
        await expect(persistArtistBio('a1', 'Replacement')).rejects.toThrow('Unpin');
        expect(set).not.toHaveBeenCalled();
    });
    it('keeps a newer artist edit when a slow generation finishes', async () => {
        const { persistArtistBio, set } = await setup();
        await expect(persistArtistBio('a1', 'AI replacement', { generated: true, expectedBio: 'Old bio' })).rejects.toThrow('changed or was pinned');
        expect(set).not.toHaveBeenCalled();
    });
    it('preserves old and new bios in history before an authorized update', async () => {
        const { persistArtistBio, set, values, tx } = await setup();
        await persistArtistBio('a1', 'New artist bio');
        expect(tx.execute).toHaveBeenCalledTimes(1);
        expect(values).toHaveBeenNthCalledWith(1, { artistId: 'a1', bioText: 'Artist edited bio', isPinned: false });
        expect(values).toHaveBeenNthCalledWith(2, { artistId: 'a1', bioText: 'New artist bio', isPinned: false });
        expect(set).toHaveBeenCalledWith({ bio: 'New artist bio' });
        expect(values.mock.invocationCallOrder[1]).toBeLessThan(set.mock.invocationCallOrder[0]);
    });
    it('caches the no-context placeholder without creating a saved bio', async () => {
        const { ABOUT_EMPTY_STATE } = await import('@/lib/bioConstants');
        const { persistArtistBio, set, values } = await setup({ bio: null });
        await persistArtistBio('a1', ABOUT_EMPTY_STATE, { generated: true, expectedBio: null });
        expect(values).not.toHaveBeenCalled();
        expect(set).toHaveBeenCalledWith({ bio: ABOUT_EMPTY_STATE });
    });
    it('publishes document and citations in the same transaction, before bio/history writes', async () => {
        const { persistArtistBio, tx, set, values } = await setup();
        const docUpsert = jest.fn().mockResolvedValue(undefined);
        const docValues = jest.fn(() => ({ onConflictDoUpdate: docUpsert }));
        tx.insert.mockReturnValueOnce({ values: docValues });
        const sources = [{ id: 1, label: 'PDF' }];
        await persistArtistBio('a1', 'Published About', { generated: true, expectedBio: 'Artist edited bio', document: { content: 'Lore', sources } });
        expect(docValues).toHaveBeenCalledWith({ artistId: 'a1', content: 'Lore', sources });
        expect(docUpsert.mock.invocationCallOrder[0]).toBeLessThan(values.mock.invocationCallOrder[0]);
        expect(docUpsert.mock.invocationCallOrder[0]).toBeLessThan(set.mock.invocationCallOrder[0]);
        const { db } = await import('@/server/db/drizzle');
        expect(db.transaction).toHaveBeenCalledTimes(1);
    });
    it('does not write bio or history if the atomic document upsert fails', async () => {
        const { persistArtistBio, tx, set, values } = await setup();
        tx.insert.mockReturnValueOnce({ values: jest.fn(() => ({ onConflictDoUpdate: jest.fn().mockRejectedValue(new Error('document write failed')) })) });
        await expect(persistArtistBio('a1', 'Published About', { generated: true, expectedBio: 'Artist edited bio', document: { content: 'Lore', sources: [] } })).rejects.toThrow('document write failed');
        expect(set).not.toHaveBeenCalled();
        expect(values).not.toHaveBeenCalled();
    });
    it.each(['placeholder', 'whitespace'])('does not snapshot an old %s when publishing a real bio', async kind => {
        const { ABOUT_EMPTY_STATE } = await import('@/lib/bioConstants');
        const bio = kind === 'placeholder' ? ` ${ABOUT_EMPTY_STATE} ` : '   ';
        const { persistArtistBio, values } = await setup({ bio });
        await persistArtistBio('a1', 'Real artist bio', { generated: true, expectedBio: bio });
        expect(values).toHaveBeenCalledTimes(1);
        expect(values).toHaveBeenCalledWith({ artistId: 'a1', bioText: 'Real artist bio', isPinned: false });
    });
});
