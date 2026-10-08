import { jest } from '@jest/globals';
jest.mock('@/server/db/drizzle', () => ({db:{execute:jest.fn()}}));
import { db } from '@/server/db/drizzle';
import { getSocialResearchRevision } from '@/server/utils/social/getSocialResearchRevision';

describe('shared research cache revision', () => {
    it('reads the revision but never returns transcript text or credentials', async () => {
        const execute=jest.mocked(db.execute);
        execute.mockResolvedValueOnce([{revision:'61|timestamp|audio-time|credits-time'}] as never);
        expect(await getSocialResearchRevision('artist')).toBe('61|timestamp|audio-time|credits-time');
    });
    it('does not claim a revision when the database read fails', async () => {
        jest.mocked(db.execute).mockRejectedValueOnce(new Error('pool unavailable'));
        expect(await getSocialResearchRevision('artist')).toBeNull();
    });
});
