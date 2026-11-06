jest.mock('@/server/utils/bio/getPublicSavedBio', () => ({ getPublicSavedBio: jest.fn() }));
jest.mock('@/server/utils/bio/getPublicArtistAbout', () => ({ getPublicArtistAbout: jest.fn() }));
import { getSharePublicBio } from '../getSharePublicBio';
import { getPublicSavedBio } from '@/server/utils/bio/getPublicSavedBio';
import { getPublicArtistAbout } from '@/server/utils/bio/getPublicArtistAbout';
import { ABOUT_EMPTY_STATE } from '@/lib/bio/bioConstants';
describe('share public bio gate', () => {
    beforeEach(() => jest.resetAllMocks());
    test('approved claim uses real published bio without querying directory prose', async () => {
        (getPublicSavedBio as jest.Mock).mockResolvedValue('Public biography.');
        expect(await getSharePublicBio({ id: 'id', bio: 'Public biography.' })).toBe('Public biography.');
        expect(getPublicArtistAbout).not.toHaveBeenCalled();
    });
    test('no approved claim never uses unrestricted artist bio', async () => {
        (getPublicSavedBio as jest.Mock).mockResolvedValue(null);
        (getPublicArtistAbout as jest.Mock).mockResolvedValue(null);
        expect(await getSharePublicBio({ id: 'id', bio: 'PRIVATE' })).toBeNull();
    });
    test('only validated public directory projection is eligible without a claim', async () => {
        (getPublicArtistAbout as jest.Mock).mockResolvedValue({ bio: 'Public directory bio.' });
        expect(await getSharePublicBio({ id: 'id', bio: 'PRIVATE' })).toBe('Public directory bio.');
    });
    test('claim nudge is not a biography', async () => {
        (getPublicSavedBio as jest.Mock).mockResolvedValue(null);
        expect(await getSharePublicBio({ id: 'id', bio: ABOUT_EMPTY_STATE })).toBeNull();
    });
    test('query error propagates for route no-store fallback', async () => {
        (getPublicSavedBio as jest.Mock).mockRejectedValue(new Error('database'));
        await expect(getSharePublicBio({ id: 'id', bio: 'PRIVATE' })).rejects.toThrow('database');
    });
});
