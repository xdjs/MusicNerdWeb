/** @jest-environment node */
import { startClaimBuild } from '../startClaimBuild';
import { callResearchApi } from '@/server/utils/questionResearch/callResearchApi';

jest.mock('@/server/utils/questionResearch/callResearchApi', () => ({ callResearchApi: jest.fn() }));

describe('startClaimBuild', () => {
    it('asks MusicNerdAPI to build the claimed page on the server', async () => {
        (callResearchApi as jest.Mock).mockResolvedValueOnce({ status: 'ok', started: true, runId: 'wrun_1' });
        await expect(startClaimBuild('aab92f80-f9e1-4299-aa33-7dd85c8de5d3')).resolves.toBe(true);
        expect(callResearchApi).toHaveBeenCalledWith('/api/onboarding/aab92f80-f9e1-4299-aa33-7dd85c8de5d3/build', { body: {} });
    });

    it('is false when the API answers without ok', async () => {
        (callResearchApi as jest.Mock).mockResolvedValueOnce({ status: 'error' });
        await expect(startClaimBuild('a1')).resolves.toBe(false);
    });
});
