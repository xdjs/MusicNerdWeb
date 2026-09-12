import { PUT } from '../route';
import { requireAuth } from '@/lib/auth-helpers';
import { canEditArtist } from '@/server/utils/artistEditAuth';
import { getAllLinks } from '@/server/utils/queries/artistQueries';
import { saveArtistLinkOrder } from '@/server/utils/queries/artistLinkOrder';
import { getActiveArtistOperation } from '@/server/utils/artistOperationContext';
import { OwnershipChangedError } from '@/server/utils/queries/ownershipWrites';

jest.mock('@/lib/auth-helpers', () => ({ requireAuth: jest.fn() }));
jest.mock('@/server/utils/artistEditAuth', () => ({ canEditArtist: jest.fn() }));
jest.mock('@/server/utils/queries/artistQueries', () => ({ getAllLinks: jest.fn() }));
jest.mock('@/server/utils/queries/artistLinkOrder', () => ({ saveArtistLinkOrder: jest.fn() }));
jest.mock('@/server/utils/queries/lorePersistence', () => ({ getLoreClaimGeneration: jest.fn().mockResolvedValue('claim-1') }));
if (!Response.json) Response.json = (data, init) => new Response(JSON.stringify(data), { ...init, headers: { 'Content-Type': 'application/json' } });
const artistId = '6cb3d81a-3d02-4c57-a711-bb7902a9af1b';
const body = { artistId, section: 'links', order: ['deezer', 'spotify'] };
function request(data: unknown = body) { return new Request('http://localhost/api/artist/link-order', { method: 'PUT', body: JSON.stringify(data) }); }
beforeEach(() => {
    jest.clearAllMocks();
    (requireAuth as jest.Mock).mockResolvedValue({ authenticated: true, userId: 'user-1' });
    (canEditArtist as jest.Mock).mockResolvedValue(true);
    (getAllLinks as jest.Mock).mockResolvedValue([]);
    (saveArtistLinkOrder as jest.Mock).mockResolvedValue(true);
});
test('requires authentication before any writes', async () => {
    (requireAuth as jest.Mock).mockResolvedValue({ authenticated: false, response: Response.json({}, { status: 401 }) });
    expect((await PUT(request())).status).toBe(401);
    expect(saveArtistLinkOrder).not.toHaveBeenCalled();
});
test('rejects edits from another artist or non-admin', async () => {
    (canEditArtist as jest.Mock).mockResolvedValue(false);
    expect((await PUT(request())).status).toBe(403);
    expect(saveArtistLinkOrder).not.toHaveBeenCalled();
});
test.each([{ ...body, artistId: 'bad' }, { ...body, section: 'bio' }, { ...body, order: ['spotify', 'spotify'] }, { ...body, order: ['unknown'] }])('rejects malformed or unknown order %j', async invalid => {
    expect((await PUT(request(invalid))).status).toBe(400);
    expect(saveArtistLinkOrder).not.toHaveBeenCalled();
});
test('carries the initiating ownership into persistence', async () => {
    (saveArtistLinkOrder as jest.Mock).mockImplementation(async () => {
        expect(getActiveArtistOperation()).toEqual({ artistId, userId: 'user-1', expectedClaimId: 'claim-1' });
        return true;
    });
    expect((await PUT(request())).status).toBe(200);
    expect(saveArtistLinkOrder).toHaveBeenCalledWith(artistId, 'links', ['deezer', 'spotify']);
});
test('fails closed if ownership changes during save', async () => {
    (saveArtistLinkOrder as jest.Mock).mockRejectedValue(new OwnershipChangedError());
    expect((await PUT(request())).status).toBe(403);
});
