/** @jest-environment node */
jest.mock('@/env', () => ({ APIFY_API_TOKEN: 'test', get INSTAGRAM_REFRESH_ENABLED() { return mockEnabled; } }));
jest.mock('@/server/db/drizzle', () => ({ db: { execute: (...args: unknown[]) => mockExecute(...args) } }));
jest.mock('../startLatestInstagramScrape', () => ({ startLatestInstagramScrape: (...args: unknown[]) => mockStart(...args) }));
jest.mock('@/server/utils/socialIngest', () => ({
    checkInstagramScrape: (...args: unknown[]) => mockCheck(...args),
    collectInstagramScrape: (...args: unknown[]) => mockCollect(...args),
}));
jest.mock('@/server/utils/queries/researchJobQueries', () => ({
    completeResearchJob: (...args: unknown[]) => mockComplete(...args),
    failResearchJob: (...args: unknown[]) => mockFail(...args),
    saveJobProgress: (...args: unknown[]) => mockProgress(...args),
}));
let runScheduledInstagram: typeof import('../runScheduledInstagram').runScheduledInstagram;
beforeAll(async () => { jest.resetModules(); ({ runScheduledInstagram } = await import('../runScheduledInstagram')); });
import type { ResearchJob } from '@/server/utils/queries/researchJobQueries';
let mockEnabled = true;
const mockExecute = jest.fn(), mockStart = jest.fn(), mockCheck = jest.fn(), mockCollect = jest.fn();
const mockComplete = jest.fn(), mockFail = jest.fn(), mockProgress = jest.fn();
const job: ResearchJob = { id: 'job1', artistId: 'artist1', kind: 'social_ingest', status: 'running',
    cursor: 0, total: null, attempts: 0, updatedAt: null, state: { scheduledInstagram: true } };
const reservation = { started_at: null, run_id: null, handle: 'artist', since: '2026-09-27T00:00:00Z' };
beforeEach(() => {
    jest.clearAllMocks(); mockExecute.mockReset(); mockEnabled = true;
    mockExecute.mockResolvedValue([]); mockStart.mockResolvedValue('run1');
    mockCheck.mockResolvedValue({ status: 'ready', datasetId: 'dataset1' });
    mockCollect.mockResolvedValue({ ingested: 1 });
});
it('marks the reserved attempt before launching, then stores its run ID', async () => {
    mockExecute.mockResolvedValueOnce([reservation]).mockResolvedValueOnce([{ job_id: job.id }]);
    await runScheduledInstagram(job, Date.now() + 55000);
    expect(mockStart).toHaveBeenCalledWith('artist', reservation.since);
    expect(mockExecute.mock.invocationCallOrder[1]).toBeLessThan(mockStart.mock.invocationCallOrder[0]!);
    expect(mockExecute.mock.invocationCallOrder[2]).toBeGreaterThan(mockStart.mock.invocationCallOrder[0]!);
    expect(mockCollect).not.toHaveBeenCalled();
});
it('never repeats a paid start after its response or saved run ID was lost', async () => {
    mockExecute.mockResolvedValueOnce([{ ...reservation, started_at: '2026-09-28' }]);
    expect(await runScheduledInstagram(job, Date.now() + 55000)).toMatchObject({ done: true });
    expect(mockStart).not.toHaveBeenCalled();
});
it('fails closed when the durable start marker cannot be written', async () => {
    mockExecute.mockResolvedValueOnce([reservation]).mockRejectedValueOnce(new Error('database unavailable'));
    await expect(runScheduledInstagram(job, Date.now() + 55000)).rejects.toThrow('database unavailable');
    expect(mockStart).not.toHaveBeenCalled();
});
it('collects only the saved bounded dataset and completes without any extraction job', async () => {
    mockExecute.mockResolvedValueOnce([{ ...reservation, run_id: 'run1' }]);
    expect(await runScheduledInstagram(job, Date.now() + 55000)).toMatchObject({ done: true });
    expect(mockCheck).toHaveBeenCalledWith('run1');
    expect(mockStart).not.toHaveBeenCalled();
    expect(mockCollect).toHaveBeenCalledWith(job.artistId, 'artist', 'dataset1', job.id, 0, { limit: 9, since: reservation.since });
    expect(mockComplete).toHaveBeenCalledWith(job.id);
});
it('retries collection against the same run, never by starting another scrape', async () => {
    mockExecute.mockResolvedValue([{ ...reservation, run_id: 'run1' }]); mockCollect.mockResolvedValueOnce(null);
    await runScheduledInstagram(job, Date.now() + 55000);
    expect(mockFail).toHaveBeenCalledTimes(1);
    await runScheduledInstagram(job, Date.now() + 55000);
    expect(mockCheck.mock.calls).toEqual([['run1'], ['run1']]);
    expect(mockStart).not.toHaveBeenCalled();
});
it('does not spend after eligibility changes or while disabled', async () => {
    await runScheduledInstagram(job, Date.now() + 55000);
    expect(mockComplete).toHaveBeenCalledWith(job.id);
    mockEnabled = false; mockExecute.mockClear();
    await runScheduledInstagram(job, Date.now() + 55000);
    expect(mockExecute).not.toHaveBeenCalled(); expect(mockStart).not.toHaveBeenCalled();
});
it('waits for enough invocation time to collect and retain thumbnails', async () => {
    mockExecute.mockResolvedValueOnce([{ ...reservation, run_id: 'run1' }]);
    expect(await runScheduledInstagram(job, Date.now() + 20000)).toMatchObject({ waiting: true });
    expect(mockCollect).not.toHaveBeenCalled();
});
