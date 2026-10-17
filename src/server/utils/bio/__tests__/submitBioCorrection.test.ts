import { submitBioCorrection } from '../submitBioCorrection';
import { db } from '@/server/db/drizzle';
jest.mock('@/server/db/drizzle', () => ({ db: { transaction: jest.fn() } }));
const execute = jest.fn(); const values = jest.fn(); const limit = jest.fn();
const tx = { execute, select: () => ({ from: () => ({ where: () => ({ limit }) }) }), insert: () => ({ values }) };
const input = { reason: 'incorrect' as const, details: 'Correction', sourceUrl: null, expectedBio: 'bio' };
beforeEach(() => { jest.clearAllMocks(); db.transaction = jest.fn(async cb => cb(tx as never)) as typeof db.transaction; });
it('locks the submitter and saves a private snapshot', async () => {
 limit.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
 expect(await submitBioCorrection('user', 'artist', input, 'bio')).toBe('created');
 expect(execute).toHaveBeenCalledTimes(1);
 expect(values).toHaveBeenCalledWith({ artistId: 'artist', userId: 'user', reason: 'incorrect', details: 'Correction', sourceUrl: null, bioSnapshot: 'bio' });
});
it('deduplicates pending reports before applying daily limit', async () => {
 limit.mockResolvedValueOnce([{ id: 'report' }]);
 expect(await submitBioCorrection('user', 'artist', input, 'bio')).toBe('duplicate');
 expect(limit).toHaveBeenCalledTimes(1); expect(values).not.toHaveBeenCalled();
});
it('limits submissions across artists to five a day', async () => {
 limit.mockResolvedValueOnce([]).mockResolvedValueOnce(Array(5).fill({ id: 'report' }));
 expect(await submitBioCorrection('user', 'artist', input, 'bio')).toBe('limited'); expect(values).not.toHaveBeenCalled();
});
