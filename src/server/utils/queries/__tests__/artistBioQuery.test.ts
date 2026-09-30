/** @jest-environment node */
jest.mock('@/server/utils/queries/artistQueries', () => ({ getArtistById: jest.fn() }));
jest.mock('@/server/utils/queries/dashboardQueries', () => ({ getBioVersionsByArtistId: jest.fn(), getVaultSourcesByArtistId: jest.fn() }));
jest.mock('@/server/utils/queries/onboardingQueries', () => ({ getArtistDocStrict: jest.fn(), getArtistDoc: jest.fn() }));
jest.mock('@/server/utils/artistDoc/generateAboutFromDoc', () => ({ generateAboutFromDoc: jest.fn() }));
jest.mock('@/server/utils/queries/bioPersistence', () => ({ persistArtistBio: jest.fn() }));
jest.mock('@/server/utils/queries/lorePersistence', () => ({ getLoreClaimGeneration: jest.fn().mockResolvedValue(null) }));
jest.mock('@/server/utils/queries/vaultWebSearch', () => ({ searchAndPopulateVault: jest.fn().mockResolvedValue([]) }));
jest.mock('@/server/utils/musicPlatform', () => ({ musicPlatformData: { getArtist: jest.fn() } }));
jest.mock('@/server/utils/queries/externalApiQueries', () => ({ getSpotifyHeaders: jest.fn(), getSpotifyCatalogNames: jest.fn() }));
jest.mock('@/server/utils/verifiedGrounding', () => ({ resolveVerifiedGrounding: jest.fn().mockResolvedValue(null) }));
import { generateArtistBio } from '../artistBioQuery';
import { getArtistById } from '../artistQueries';
import { getBioVersionsByArtistId, getVaultSourcesByArtistId } from '../dashboardQueries';
import { getArtistDocStrict } from '../onboardingQueries';
import { generateAboutFromDoc } from '../../artistDoc/generateAboutFromDoc';
import { persistArtistBio } from '../bioPersistence';
import { searchAndPopulateVault } from '../vaultWebSearch';
import { musicPlatformData } from '../../musicPlatform';
import { BioConflictError } from '@/lib/bio/bioConflict';
import { OwnershipChangedError } from '../ownershipWrites';
if (!Response.json) Response.json = (data, init) => new Response(JSON.stringify(data), { ...init, headers: { 'Content-Type': 'application/json' } });
const auth = { userId: 'editor', expectedClaimId: 'claim' };
const manifest = [{ id: 1, kind: 'vault', label: 'Interview', url: 'https://example.org/interview' }];
beforeEach(() => {
  jest.clearAllMocks();
  (getArtistById as jest.Mock).mockResolvedValue({ id: 'a1', name: 'Artist', bio: 'Original About', spotify: 'sp1' });
  (getBioVersionsByArtistId as jest.Mock).mockResolvedValue([]);
  (getVaultSourcesByArtistId as jest.Mock).mockResolvedValue([]);
  (getArtistDocStrict as jest.Mock).mockResolvedValue({ content: 'Stored Lore [1]', sources: manifest });
  (generateAboutFromDoc as jest.Mock).mockResolvedValue('About from Lore [1]');
  (persistArtistBio as jest.Mock).mockImplementation((_id, bio) => Promise.resolve(bio));
});
it('summarizes only saved Lore and passes its citation manifest', async () => {
  const response = await generateArtistBio('a1', auth);
  expect(await response.json()).toEqual({ bio: 'About from Lore' });
  expect(generateAboutFromDoc).toHaveBeenCalledWith('Artist', 'Stored Lore [1]', manifest);
  expect(persistArtistBio).toHaveBeenCalledWith('a1', 'About from Lore', { generated: true, expectedBio: 'Original About', ownership: auth });
  expect(searchAndPopulateVault).not.toHaveBeenCalled();
  expect(getVaultSourcesByArtistId).not.toHaveBeenCalled();
  expect(musicPlatformData.getArtist).not.toHaveBeenCalled();
});
it.each([null, { content: '  ', sources: [] }])('missing Lore never researches or overwrites a saved About', async doc => {
  (getArtistDocStrict as jest.Mock).mockResolvedValue(doc);
  const response = await generateArtistBio('a1', auth);
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ code: 'LORE_REQUIRED', error: expect.stringContaining('Lore') });
  expect(persistArtistBio).not.toHaveBeenCalled();
  expect(generateAboutFromDoc).not.toHaveBeenCalled();
  expect(searchAndPopulateVault).not.toHaveBeenCalled();
});
it('preserves pinned About without generating', async () => {
  (getBioVersionsByArtistId as jest.Mock).mockResolvedValue([{ isPinned: true }]);
  expect(await (await generateArtistBio('a1', auth)).json()).toMatchObject({ bio: 'Original About', pinned: true });
  expect(generateAboutFromDoc).not.toHaveBeenCalled();
});
it.each([new BioConflictError(), new OwnershipChangedError()])('returns a conflict when persistence rejects stale ownership or text', async error => {
  (persistArtistBio as jest.Mock).mockRejectedValue(error);
  expect((await generateArtistBio('a1', auth)).status).toBe(409);
});
it('does not treat a Lore database failure as permission to research', async () => {
  (getArtistDocStrict as jest.Mock).mockRejectedValue(new Error('DB offline'));
  expect((await generateArtistBio('a1', auth)).status).toBe(500);
  expect(searchAndPopulateVault).not.toHaveBeenCalled();
  expect(persistArtistBio).not.toHaveBeenCalled();
});
it('returns 404 for a missing artist', async () => {
  (getArtistById as jest.Mock).mockResolvedValue(null);
  expect((await generateArtistBio('missing', auth)).status).toBe(404);
});

it('preserves the retryable timeout status without overwriting About', async () => {
  (generateAboutFromDoc as jest.Mock).mockRejectedValue(new Error('Gemini timeout'));
  const response = await generateArtistBio('a1', auth);
  expect(response.status).toBe(408);
  expect(await response.json()).toEqual({ error: 'About generation timed out. Please try again. Your existing About has been kept.' });
  expect(persistArtistBio).not.toHaveBeenCalled();
});

it.each(['[1]', '[1].', '[1, 2] — …!', 'https://example.org/source [1].', '123 [1]'])('keeps the existing bio when cleaning %s leaves no prose', async draft => {
  (generateAboutFromDoc as jest.Mock).mockResolvedValue(draft);
  const response = await generateArtistBio('a1', auth);
  expect(response.status).toBe(500);
  expect(persistArtistBio).not.toHaveBeenCalled();
});

it('cleans links and citations before saving the About and its history', async () => {
  (generateAboutFromDoc as jest.Mock).mockResolvedValue('An [ambient trio](https://example.org/trio) records piano [1]. ([Source](https://example.org/source)) More at https://example.org/notes');
  const response = await generateArtistBio('a1', auth);
  expect(await response.json()).toEqual({ bio: 'An ambient trio records piano. More at' });
  expect(persistArtistBio).toHaveBeenCalledWith('a1', 'An ambient trio records piano. More at', expect.objectContaining({ generated: true }));
});

it('accepts prose written with non-Latin letters', async () => {
  (generateAboutFromDoc as jest.Mock).mockResolvedValue('東京の音楽家です。[1]');
  expect(await (await generateArtistBio('a1', auth)).json()).toEqual({ bio: '東京の音楽家です。' });
  expect(persistArtistBio).toHaveBeenCalledWith('a1', '東京の音楽家です。', expect.objectContaining({ generated: true }));
});
