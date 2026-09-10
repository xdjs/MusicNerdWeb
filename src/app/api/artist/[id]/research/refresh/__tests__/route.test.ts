// @ts-nocheck
import { jest } from '@jest/globals';
jest.mock('@/server/utils/queries/lorePersistence', () => ({ getLoreClaimGeneration: jest.fn().mockResolvedValue('claim-1') }));
jest.mock('@/server/auth', () => ({ getServerAuthSession: jest.fn() }));
jest.mock('@/server/utils/artistEditAuth', () => ({ canEditArtist: jest.fn() }));
jest.mock('@/server/utils/researchRunner', () => ({ requestArtistResearch: jest.fn() }));
jest.mock('@/server/utils/queries/researchJobQueries', () => ({ getResearchJobs: jest.fn(), reopenResearchJob: jest.fn() }));
jest.mock('@/server/utils/queries/loreRefresh', () => ({ queueLoreRefresh: jest.fn() }));
if (!('json' in Response)) Response.json = (body, init) => new Response(JSON.stringify(body), { status: init?.status ?? 200 });
describe('Look again refreshes documents independently of social cooldown', () => {
    beforeEach(() => { jest.resetModules(); });
    async function setup() {
        const auth = await import('@/server/auth');
        const edit = await import('@/server/utils/artistEditAuth');
        const jobs = await import('@/server/utils/queries/researchJobQueries');
        const queue = await import('@/server/utils/queries/loreRefresh');
        const runner = await import('@/server/utils/researchRunner');
        auth.getServerAuthSession.mockResolvedValue({ user: { id: 'owner' } });
        edit.canEditArtist.mockResolvedValue(true);
        jobs.getResearchJobs.mockResolvedValue([{ kind:'social_ingest', status:'done', updatedAt:new Date().toISOString() }]);
        const { POST } = await import('../route');
        return { auth, edit, queue, runner, call: () => POST(new Request('https://example.test'), { params:Promise.resolve({ id:'artist' }) }) };
    }
    it('queues Lore during social cooldown without re-running social scraping', async () => {
        const { call, queue, runner } = await setup();
        const res = await call();
        expect(res.status).toBe(200);
        expect(queue.queueLoreRefresh).toHaveBeenCalledWith('artist', 'claim-1', { manual: true });
        expect(runner.requestArtistResearch).not.toHaveBeenCalled();
        expect((await res.json()).message).toContain('current documents');
    });
    it('does not enqueue anything for someone who cannot edit the artist', async () => {
        const { call, edit, queue } = await setup();
        edit.canEditArtist.mockResolvedValue(false);
        expect((await call()).status).toBe(403);
        expect(queue.queueLoreRefresh).not.toHaveBeenCalled();
    });
    it('reports the Lore cooldown without blocking an eligible social refresh', async () => {
        const { call, queue, runner } = await setup();
        const jobs = await import('@/server/utils/queries/researchJobQueries');
        jobs.getResearchJobs.mockResolvedValue([]);
        queue.queueLoreRefresh.mockResolvedValue(false);
        const res = await call();
        expect(res.status).toBe(200);
        expect((await res.json()).message).toContain('already queued or was checked recently');
        expect(runner.requestArtistResearch).toHaveBeenCalledWith('artist', { force: true });
    });
    it('carries the original claim through job reopen and social scheduling', async () => {
        const { call, runner } = await setup();
        const jobs = await import('@/server/utils/queries/researchJobQueries');
        const { getActiveArtistOperation } = await import('@/server/utils/artistOperationContext');
        jobs.getResearchJobs.mockResolvedValue([]);
        const contexts = [];
        jobs.reopenResearchJob.mockImplementation(async () => { contexts.push(getActiveArtistOperation()); });
        runner.requestArtistResearch.mockImplementation(async () => { contexts.push(getActiveArtistOperation()); });
        expect((await call()).status).toBe(200);
        expect(contexts).toEqual(Array(3).fill({ artistId: 'artist', userId: 'owner', expectedClaimId: 'claim-1' }));
        expect(getActiveArtistOperation()).toBeUndefined();
    });
});
