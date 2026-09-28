/** @jest-environment node */
jest.mock('@/server/utils/queries/artistQueries', () => ({ getArtistById: jest.fn() }));
jest.mock('@/server/utils/queries/dashboardQueries', () => ({ getBioVersionsByArtistId: jest.fn().mockResolvedValue([]) }));
jest.mock('@/server/utils/queries/onboardingQueries', () => ({ getArtistDocStrict: jest.fn() }));
jest.mock('@/server/utils/queries/bioPersistence', () => ({ persistArtistBio: jest.fn((_id, bio) => Promise.resolve(bio)) }));
jest.mock('@/server/lib/ai/streamText', () => ({ streamText: jest.fn() }));
import { generateArtistBio } from '@/server/utils/queries/artistBioQuery';
import { getArtistById } from '@/server/utils/queries/artistQueries';
import { getArtistDocStrict } from '@/server/utils/queries/onboardingQueries';
import { streamText } from '@/server/lib/ai/streamText';
if (!Response.json) Response.json = (data, init) => new Response(JSON.stringify(data), { ...init, headers: { 'Content-Type': 'application/json' } });
it('uses the real Lore-to-About helper, preserves valid citations, and never enables search', async () => {
  (getArtistById as jest.Mock).mockResolvedValue({ name: 'Artist', bio: null });
  (getArtistDocStrict as jest.Mock).mockResolvedValue({ content: 'The actual Lore [1]', sources: [{ id: 1, kind: 'vault', label: 'Interview', url: 'https://example.org/interview' }] });
  (streamText as jest.Mock).mockResolvedValue({ text: 'About from Lore [1] with a bogus citation [8].' });
  const response = await generateArtistBio('a1', { userId: 'editor', expectedClaimId: null });
  const result = await response.json();
  expect(result.bio).toContain('[1]');
  expect(result.bio).not.toContain('[8]');
  expect(streamText).toHaveBeenCalledWith(expect.objectContaining({ prompt: 'ARTIST KNOWLEDGE DOCUMENT:\nThe actual Lore [1]' }));
  expect((streamText as jest.Mock).mock.calls[0][0].googleSearch).toBeUndefined();
});
