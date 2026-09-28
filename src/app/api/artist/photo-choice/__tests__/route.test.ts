/** @jest-environment node */
jest.mock('@/server/utils/analytics/trackServerEvent', () => ({ trackServerEvent: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/server/auth', () => ({ getServerAuthSession: jest.fn() }));
jest.mock('@/server/utils/dev-auth', () => ({ getDevSession: jest.fn().mockResolvedValue(null) }));
jest.mock('@/server/utils/artistEditAuth', () => ({ canEditArtist: jest.fn() }));
jest.mock('@/server/utils/musicPlatform/getProviderPhoto', () => ({ getProviderPhoto: jest.fn() }));
jest.mock('@/server/utils/queries/lorePersistence', () => ({ getLoreClaimGeneration: jest.fn().mockResolvedValue(null) }));
jest.mock('@/server/utils/artistOperationContext', () => ({ withArtistOperation: jest.fn((_id, _ctx, fn) => fn()) }));
jest.mock('@/server/utils/queries/ownershipWrites', () => ({
    withScopedArtistWrite: jest.fn(), OwnershipChangedError: class extends Error {},
}));
jest.mock('@/server/db/drizzle', () => ({ db: { query: { artists: { findFirst: jest.fn() } } } }));
import { trackServerEvent } from '@/server/utils/analytics/trackServerEvent';
import { GET, PATCH } from '../route';
import { getServerAuthSession } from '@/server/auth';
import { canEditArtist } from '@/server/utils/artistEditAuth';
import { getProviderPhoto } from '@/server/utils/musicPlatform/getProviderPhoto';
import { withScopedArtistWrite, OwnershipChangedError } from '@/server/utils/queries/ownershipWrites';
import { db } from '@/server/db/drizzle';
if (!Response.json) Response.json = (data: unknown, init?: ResponseInit) => new Response(JSON.stringify(data), { ...init, headers: { 'Content-Type': 'application/json' } });
const artistId = '00000000-0000-4000-8000-000000000001';
const imageUrl = 'https://i.scdn.co/image/photo';
const body = { artistId, source: 'spotify', providerId: 'sp', imageUrl, expectedCustomImage: 'https://storage.example/pete.png' };
const request = (data: unknown = body) => new Request('https://example.test/api/artist/photo-choice', { method: 'PATCH', body: JSON.stringify(data) });
beforeEach(() => {
    jest.clearAllMocks();
    (getServerAuthSession as jest.Mock).mockResolvedValue({ user: { id: 'owner' } });
    (canEditArtist as jest.Mock).mockResolvedValue(true);
    (db.query.artists.findFirst as jest.Mock).mockResolvedValue({ id: artistId, customImage: body.expectedCustomImage, spotify: 'sp', deezer: 'dz' });
    (getProviderPhoto as jest.Mock).mockResolvedValue(imageUrl);
    (withScopedArtistWrite as jest.Mock).mockResolvedValue([{ imagePath: imageUrl, position: null }]);
});
it('rejects anonymous reads and writes before provider work', async () => {
    (getServerAuthSession as jest.Mock).mockResolvedValue(null);
    expect((await GET(new Request(`https://example.test?artistId=${artistId}`))).status).toBe(401);
    expect((await PATCH(request())).status).toBe(401);
    expect(getProviderPhoto).not.toHaveBeenCalled();
});
it('rejects non-owners', async () => {
    (canEditArtist as jest.Mock).mockResolvedValue(false);
    expect((await PATCH(request())).status).toBe(403);
    expect((await GET(new Request(`https://example.test?artistId=${artistId}`))).status).toBe(403);
    expect(withScopedArtistWrite).not.toHaveBeenCalled();
});
it('previews without writing or clearing the existing image', async () => {
    const response = await GET(new Request(`https://example.test?artistId=${artistId}`));
    expect(await response.json()).toMatchObject({ expectedCustomImage: body.expectedCustomImage, options: [{ source: 'deezer' }, { source: 'spotify' }] });
    expect(withScopedArtistWrite).not.toHaveBeenCalled();
});
it('rejects arbitrary images and unknown fields', async () => {
    expect((await PATCH(request({ ...body, imageUrl: 'https://evil.example/image' }))).status).toBe(409);
    expect((await PATCH(request({ ...body, arbitrary: true }))).status).toBe(400);
    expect(withScopedArtistWrite).not.toHaveBeenCalled();
});
it('preserves current image on provider failure', async () => {
    (getProviderPhoto as jest.Mock).mockResolvedValue(null);
    expect((await PATCH(request())).status).toBe(503);
    expect(withScopedArtistWrite).not.toHaveBeenCalled();
});
it('rejects stale saved images and changed provider links', async () => {
    expect((await PATCH(request({ ...body, expectedCustomImage: null }))).status).toBe(409);
    expect((await PATCH(request({ ...body, providerId: 'old' }))).status).toBe(409);
    expect(withScopedArtistWrite).not.toHaveBeenCalled();
});
it('saves only a server-resolved photo under the ownership guard', async () => {
    const result = await PATCH(request());
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ success: true, imagePath: imageUrl, position: 0 });
    expect(withScopedArtistWrite).toHaveBeenCalledWith(artistId, expect.any(Function));
    expect(trackServerEvent).toHaveBeenCalledWith('profile_edit', { action: 'photo', target: null });
});
it('reports a concurrent image save without overwriting it', async () => {
    (withScopedArtistWrite as jest.Mock).mockResolvedValue([]);
    expect((await PATCH(request())).status).toBe(409);
    expect(trackServerEvent).not.toHaveBeenCalled();
});
it('reports revoked ownership during provider lookup', async () => {
    (withScopedArtistWrite as jest.Mock).mockRejectedValue(new OwnershipChangedError());
    expect((await PATCH(request())).status).toBe(403);
});
