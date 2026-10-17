/** @jest-environment node */
import { GET } from '../route';
import { getArtistById } from '@/server/utils/queries/artistQueries';
import { getLoreClaimGeneration } from '@/server/utils/queries/lorePersistence';
import { getPublicArtistAbout } from '@/server/utils/bio/getPublicArtistAbout';
import { generateArtistBio } from '@/server/utils/queries/artistBioQuery';
import { ABOUT_EMPTY_STATE } from '@/lib/bio/bioConstants';
jest.mock('@/server/utils/queries/artistQueries', () => ({ getArtistById: jest.fn() }));
jest.mock('@/server/utils/queries/lorePersistence', () => ({ getLoreClaimGeneration: jest.fn() }));
jest.mock('@/server/utils/bio/getPublicArtistAbout', () => ({ getPublicArtistAbout: jest.fn() }));
jest.mock('@/server/utils/queries/artistBioQuery', () => ({ generateArtistBio: jest.fn() }));
jest.mock('@/lib/auth-helpers', () => ({ requireArtistEditor: jest.fn() }));
Response.json = (data, init) => new Response(JSON.stringify(data), { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
const about = { bio: 'A sourced directory biography.', kind: 'researched' as const, sources: [{ id: 'source', url: 'https://artist.example/bio', label: 'Artist biography' }] };
const send = () => GET(new Request('https://musicnerd.net/api/artistBio/artist'), { params: Promise.resolve({ id: 'artist' }) });
beforeEach(() => {
 jest.clearAllMocks();
 jest.mocked(getArtistById).mockResolvedValue({ bio: 'Private legacy bio' } as never);
 jest.mocked(getLoreClaimGeneration).mockResolvedValue(null);
 jest.mocked(getPublicArtistAbout).mockResolvedValue(about);
});
it('returns only eligible public About and provenance on an anonymous read', async () => {
 const response = await send();
 expect(await response.json()).toEqual({ bio: about.bio, publicAbout: about });
 expect(response.headers.get('Cache-Control')).toBe('private, no-store');
 expect(generateArtistBio).not.toHaveBeenCalled();
});
it('withdraws eligible About without falling back to a stored private draft', async () => {
 jest.mocked(getPublicArtistAbout).mockResolvedValue(null);
 expect(await (await send()).json()).toEqual({ bio: ABOUT_EMPTY_STATE, publicAbout: null });
 expect(generateArtistBio).not.toHaveBeenCalled();
});
it('keeps a claimed artist edit authoritative and skips directory preparation', async () => {
 jest.mocked(getLoreClaimGeneration).mockResolvedValue('approved');
 jest.mocked(getArtistById).mockResolvedValue({ bio: 'The artist wrote this.' } as never);
 expect(await (await send()).json()).toEqual({ bio: 'The artist wrote this.', publicAbout: null });
 expect(getPublicArtistAbout).not.toHaveBeenCalled();
});
