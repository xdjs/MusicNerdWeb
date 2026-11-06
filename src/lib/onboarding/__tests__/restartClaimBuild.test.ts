/** @jest-environment node */
import { restartClaimBuild } from '../restartClaimBuild';

jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api.test${path}` }));

afterEach(() => jest.restoreAllMocks());

describe('restartClaimBuild', () => {
    it('restarts the build as the signed-in claimant', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: true });
        await expect(restartClaimBuild('a1', 'tok')).resolves.toBe(true);
        expect(global.fetch).toHaveBeenCalledWith('https://api.test/api/onboarding/a1/build', {
            method: 'POST',
            headers: { Authorization: 'Bearer tok' },
        });
    });

    it('is false when the API refuses or is unreachable', async () => {
        global.fetch = jest.fn().mockResolvedValueOnce({ ok: false }).mockRejectedValueOnce(new Error('offline'));
        await expect(restartClaimBuild('a1', 'tok')).resolves.toBe(false);
        await expect(restartClaimBuild('a1', 'tok')).resolves.toBe(false);
    });
});
