/** @jest-environment node */
import { db } from '@/server/db/drizzle';
import { getClaimByArtistId } from '../dashboardQueries';

describe('getClaimByArtistId', () => {
    afterEach(() => jest.restoreAllMocks());

    it.each(['pending', 'approved'])('returns the active %s claim', async status => {
        const claim = { id: 'claim-1', artistId: 'artist-1', userId: 'user-1', status };
        (db.query.artistClaims.findFirst as jest.Mock).mockResolvedValueOnce(claim);
        await expect(getClaimByArtistId('artist-1')).resolves.toBe(claim);
    });

    it('distinguishes a successful empty lookup from a failed read', async () => {
        (db.query.artistClaims.findFirst as jest.Mock).mockResolvedValueOnce(undefined);
        await expect(getClaimByArtistId('artist-1')).resolves.toBeNull();
    });

    it('preserves an unknown result when the database read fails', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        (db.query.artistClaims.findFirst as jest.Mock).mockRejectedValueOnce(new Error('Claim lookup unavailable'));
        await expect(getClaimByArtistId('artist-1')).resolves.toBeUndefined();
    });
});
