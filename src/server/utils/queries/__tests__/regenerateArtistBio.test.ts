jest.mock('../artistBioQuery', () => ({ generateArtistBio: jest.fn() }));
import { generateArtistBio } from '../artistBioQuery';
import { regenerateArtistBio } from '../regenerateArtistBio';
const auth = { userId: 'editor', expectedClaimId: 'claim' };
it('passes the initiating editor to generation and returns the saved text', async () => {
  (generateArtistBio as jest.Mock).mockResolvedValue({ status: 200, json: async () => ({ bio: 'Saved text' }) });
  await expect(regenerateArtistBio('a1', auth)).resolves.toBe('Saved text');
  expect(generateArtistBio).toHaveBeenCalledWith('a1', auth);
});
it('keeps the missing-Lore explanation for server action callers', async () => {
  (generateArtistBio as jest.Mock).mockResolvedValue({ status: 409, json: async () => ({ error: 'Build your Lore document first' }) });
  await expect(regenerateArtistBio('a1', auth)).rejects.toThrow('Build your Lore document first');
});
