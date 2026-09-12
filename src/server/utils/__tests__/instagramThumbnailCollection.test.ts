// @ts-nocheck
jest.mock('@/env', () => ({ ...jest.requireActual('@/env'), APIFY_API_TOKEN: 'test-apify', SUPABASE_URL: 'https://test.supabase.co' }));
const retain = jest.fn(async rows => rows.map(row => ({ ...row, raw: { ...row.raw, displayUrl: 'https://test.supabase.co/retained.webp', _musicnerdThumbnail: { version: 1 } } })));
let insideWrite = false;
let revoked = false;
const cleanup = jest.fn(async () => {});
jest.mock('@/server/utils/instagramThumbnail', () => ({ ...jest.requireActual('@/server/utils/instagramThumbnail'), retainInstagramThumbnails: (...args) => retain(...args), removeRevokedInstagramThumbnails: (...args) => cleanup(...args) }));
jest.mock('@/server/utils/queries/ownershipWrites', () => ({
    ...jest.requireActual('@/server/utils/queries/ownershipWrites'),
    withResearchJobWrite: async (_artist, _job, write) => {
        if (revoked) throw new (jest.requireActual('@/server/utils/queries/ownershipWrites').OwnershipChangedError)();
        insideWrite = true;
        try { return await write(require('@/server/db/drizzle').db); } finally { insideWrite = false; }
    },
}));
import { collectInstagramScrape, mapApifyPost } from '../socialIngest';
import { db } from '@/server/db/drizzle';

it('collects thumbnails outside the write fence and resumes without skipping posts', async () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ id: String(i + 1), ownerUsername: 'artist', url: `https://www.instagram.com/p/p${i}/` }));
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => items }));
    db.query.artists.findFirst.mockResolvedValue({ name: 'Artist' });
    const written = [];
    db.insert.mockReturnValue({ values: row => {
        expect(insideWrite).toBe(true);
        written.push(row);
        return { onConflictDoUpdate: jest.fn(async () => {}) };
    } });
    retain.mockImplementation(async rows => {
        expect(insideWrite).toBe(false);
        return rows.map(row => ({ ...row, raw: { displayUrl: 'https://test.supabase.co/retained.webp', _musicnerdThumbnail: { version: 1 } } }));
    });
    expect(await collectInstagramScrape('artist-id', 'artist', 'dataset', 'job', 0)).toMatchObject({ ingested: 9, nextCursor: 9 });
    expect(await collectInstagramScrape('artist-id', 'artist', 'dataset', 'job', 9)).toMatchObject({ ingested: 9, nextCursor: 18 });
    expect(await collectInstagramScrape('artist-id', 'artist', 'dataset', 'job', 18)).toEqual({ ingested: 2, ownPosts: 2, collabPosts: 0 });
    expect(written.map(row => row.platformPostId)).toEqual(items.map(item => item.id));
    expect(written.every(row => row.raw._musicnerdThumbnail.version === 1)).toBe(true);
});

it('does not trust retention metadata supplied by the scraper, including collaborator rows', () => {
    const row = mapApifyPost({ id: '1', url: 'https://www.instagram.com/p/abc/', ownerUsername: 'someone-else', _musicnerdThumbnail: { version: 1, url: 'https://fake.test' } }, 'artist', 'artist');
    expect(row.isOwnPost).toBe(false);
    expect(row.raw).not.toHaveProperty('_musicnerdThumbnail');
});

it('cleans late uploads when revocation finishes during retention, before the guarded write', async () => {
    revoked = false;
    cleanup.mockClear();
    const items = [{ id: '1', ownerUsername: 'artist', url: 'https://www.instagram.com/p/one/' }];
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => items }));
    db.query.artists.findFirst.mockResolvedValue({ name: 'Artist' });
    db.insert.mockClear();
    retain.mockImplementationOnce(async (rows, scope) => {
        // Simulate revoke deleting the job and finishing its storage purge,
        // followed by the in-flight upload completing afterward.
        revoked = true;
        scope.attemptedPaths.add('late-upload');
        return rows;
    });
    await expect(collectInstagramScrape('artist-id', 'artist', 'dataset', 'job')).rejects.toThrow('ownership changed');
    expect(db.insert).not.toHaveBeenCalled();
    expect(cleanup).toHaveBeenCalledWith('artist-id', { jobId: 'job', attemptedPaths: new Set(['late-upload']) });
    revoked = false;
});

it('does not upload for a job that was revoked before collection started', async () => {
    revoked = true;
    retain.mockClear();
    await expect(collectInstagramScrape('artist-id', 'artist', 'dataset', 'job')).rejects.toThrow('ownership changed');
    expect(retain).not.toHaveBeenCalled();
    revoked = false;
});

it('reuses stored post thumbnails across refresh jobs while updating captions and retaining new posts', async () => {
    const artist = '50f23458-df64-4381-8042-7333e8b64531';
    const metadata = { version: 1, sha256: 'a'.repeat(64), url: `https://test.supabase.co/storage/v1/object/public/vault-files/${artist}/instagram-11111111-1111-4111-8111-111111111111-1-${'a'.repeat(64)}.webp` };
    db.query.artistSocialPosts.findMany.mockResolvedValue([{ platformPostId: '1', raw: { _musicnerdThumbnail: metadata } }]);
    const items = [1, 2].map(id => ({ id: String(id), ownerUsername: 'artist', caption: 'Updated caption', url: `https://www.instagram.com/p/p${id}/` }));
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => items }));
    retain.mockImplementation(async rows => rows);
    const written = [];
    db.insert.mockReturnValue({ values: row => {
        written.push(row);
        return { onConflictDoUpdate: jest.fn(async () => {}) };
    } });
    for (const jobId of ['new-job', 'another-job']) {
        retain.mockClear();
        await collectInstagramScrape(artist, 'artist', 'dataset', jobId);
        expect(retain.mock.calls[0][0].map(row => row.platformPostId)).toEqual(['2']);
    }
    expect(written.filter(row => row.platformPostId === '1').every(row => row.raw.displayUrl === metadata.url && row.caption === 'Updated caption')).toBe(true);
    db.query.artistSocialPosts.findMany.mockResolvedValue([]);
});
