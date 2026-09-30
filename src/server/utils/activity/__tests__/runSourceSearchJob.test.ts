jest.mock('@/server/db/drizzle', () => ({ db: { select: jest.fn() } }));
jest.mock('@/server/utils/queries/researchJobQueries', () => ({ completeResearchJob: jest.fn(), saveJobProgress: jest.fn() }));
jest.mock('@/server/utils/queries/vaultWebSearch', () => ({ searchAndPopulateVault: jest.fn() }));
import { db } from '@/server/db/drizzle';
import { runSourceSearchJob } from '../runSourceSearchJob';
import { searchAndPopulateVault } from '../../queries/vaultWebSearch';
import { getActiveArtistOperation } from '../../artistOperationContext';
import { completeResearchJob, saveJobProgress, type ResearchJob } from '../../queries/researchJobQueries';
const job: ResearchJob = { id: 'job', artistId: 'a1', kind: 'source_search', status: 'running', cursor: 0, total: null, attempts: 0, state: { claimId: 'claim' }, updatedAt: null, activityId: 'event' };
beforeEach(() => {
  jest.clearAllMocks();
  (db.select as jest.Mock).mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [{ id: 'event', artistId: 'a1', actorKind: 'user', actorUserId: 'approving-admin', trigger: 'claim_approval' }] }) }) });
  (searchAndPopulateVault as jest.Mock).mockResolvedValue([]);
});
it('uses the persisted approving admin and event when the worker runs later', async () => {
  let observed;
  (searchAndPopulateVault as jest.Mock).mockImplementation(async () => { observed = getActiveArtistOperation(); return []; });
  expect(await runSourceSearchJob(job, Date.now() + 50_000)).toMatchObject({ done: true });
  expect(observed).toMatchObject({ userId: 'approving-admin', activityId: 'event', sourceOrigin: 'research', expectedClaimId: 'claim', trigger: 'claim_approval' });
  expect(completeResearchJob).toHaveBeenCalledWith('job');
  expect(searchAndPopulateVault).toHaveBeenCalledWith('a1', expect.objectContaining({ requireComplete: true }));
  expect(getActiveArtistOperation()).toBeUndefined();
});
it('leaves failed searches for the scheduler retry policy instead of completing them', async () => {
  (searchAndPopulateVault as jest.Mock).mockRejectedValue(new Error('search provider unavailable'));
  await expect(runSourceSearchJob(job, Date.now() + 50_000)).rejects.toThrow('search provider unavailable');
  expect(completeResearchJob).not.toHaveBeenCalled();
  expect(getActiveArtistOperation()).toBeUndefined();
});
it('does not start a partial search when the worker lacks a full slice', async () => {
  expect(await runSourceSearchJob(job, Date.now() + 5_000)).toMatchObject({ waiting: true, done: false });
  expect(saveJobProgress).toHaveBeenCalledWith('job', 0);
  expect(searchAndPopulateVault).not.toHaveBeenCalled();
});
it('does not invent an initiator when attribution is missing', async () => {
  await expect(runSourceSearchJob({ ...job, activityId: null }, Date.now() + 50_000)).rejects.toThrow('initiating event');
  expect(searchAndPopulateVault).not.toHaveBeenCalled();
});
it('finishes a cancelled job when its initiating account no longer exists', async () => {
  (db.select as jest.Mock).mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [{ id: 'event', artistId: 'a1', actorKind: 'user', actorUserId: null, trigger: 'claim_approval' }] }) }) });
  expect(await runSourceSearchJob(job, Date.now() + 50_000)).toMatchObject({ done: true, progress: expect.stringContaining('cancelled') });
  expect(completeResearchJob).toHaveBeenCalledWith('job');
  expect(searchAndPopulateVault).not.toHaveBeenCalled();
});
