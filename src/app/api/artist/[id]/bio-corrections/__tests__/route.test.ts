/** @jest-environment node */
import { POST } from '../route';
import { requireAuth } from '@/lib/auth-helpers';
import { getArtistById } from '@/server/utils/queries/artistQueries';
import { getLoreClaimGeneration } from '@/server/utils/queries/lorePersistence';
import { getPublicArtistAbout } from '@/server/utils/bio/getPublicArtistAbout';
import { submitBioCorrection } from '@/server/utils/bio/submitBioCorrection';
jest.mock('@/lib/auth-helpers', () => ({ requireAuth: jest.fn() }));
jest.mock('@/server/utils/queries/artistQueries', () => ({ getArtistById: jest.fn() }));
jest.mock('@/server/utils/queries/lorePersistence', () => ({ getLoreClaimGeneration: jest.fn() }));
jest.mock('@/server/utils/bio/getPublicArtistAbout', () => ({ getPublicArtistAbout: jest.fn() }));
jest.mock('@/server/utils/bio/submitBioCorrection', () => ({ submitBioCorrection: jest.fn() }));
Response.json = (data, init) => new Response(JSON.stringify(data), { ...init, headers: { 'Content-Type': 'application/json' } });
const id = '11111111-1111-4111-8111-111111111111';
const bio = 'A verified biography of this artist.';
const send = (body: unknown = { reason: 'incorrect', expectedBio: bio }) => POST(new Request('https://musicnerd.net/api', { method: 'POST', body: JSON.stringify(body) }), { params: Promise.resolve({ id }) });
beforeEach(() => {
 jest.clearAllMocks();
 jest.mocked(requireAuth).mockResolvedValue({ authenticated: true, userId: 'user', session: {} } as never);
 jest.mocked(getArtistById).mockResolvedValue({ bio } as never);
 jest.mocked(getLoreClaimGeneration).mockResolvedValue('claim');
 jest.mocked(submitBioCorrection).mockResolvedValue('created');
});
it('rejects anonymous reports before reading data', async () => {
 jest.mocked(requireAuth).mockResolvedValue({ authenticated: false, response: Response.json({}, { status: 401 }) });
 expect((await send()).status).toBe(401); expect(getArtistById).not.toHaveBeenCalled();
});
it('persists the server bio with authenticated identity', async () => {
 expect((await send()).status).toBe(201);
 expect(submitBioCorrection).toHaveBeenCalledWith('user', id, expect.objectContaining({ reason: 'incorrect' }), bio);
});
it('refuses stale snapshots', async () => {
 expect((await send({ reason: 'incorrect', expectedBio: 'Old bio' })).status).toBe(409);
 expect(submitBioCorrection).not.toHaveBeenCalled();
});
it('does not expose or report arbitrary unclaimed bios', async () => {
 jest.mocked(getLoreClaimGeneration).mockResolvedValue(null);
 jest.mocked(getPublicArtistAbout).mockResolvedValue(null);
 expect((await send()).status).toBe(409); expect(submitBioCorrection).not.toHaveBeenCalled();
});
it('accepts only eligible directory About', async () => {
 jest.mocked(getLoreClaimGeneration).mockResolvedValue(null);
 jest.mocked(getPublicArtistAbout).mockResolvedValue({ bio, kind: 'researched', sources: [] } as never);
 expect((await send()).status).toBe(201);
});
it.each([['duplicate', 200], ['limited', 429]] as const)('handles %s without another report', async (result, status) => {
 jest.mocked(submitBioCorrection).mockResolvedValue(result);
 expect((await send()).status).toBe(status);
});
it('rejects invalid reports', async () => { expect((await send({ reason: 'invented' })).status).toBe(400); });

it('compares the same sanitized published bio that the client displays', async () => {
 jest.mocked(getArtistById).mockResolvedValue({ bio: `${bio} ([Source](https://example.com))` } as never);
 expect((await send()).status).toBe(201);
 expect(submitBioCorrection).toHaveBeenCalledWith('user', id, expect.anything(), bio);
});
