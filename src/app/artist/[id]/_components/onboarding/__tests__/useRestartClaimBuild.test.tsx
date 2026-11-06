// @ts-nocheck
import { renderHook, act } from '@testing-library/react';
import { useRestartClaimBuild } from '../useRestartClaimBuild';
import { restartClaimBuild } from '@/lib/onboarding/restartClaimBuild';

const getAccessToken = jest.fn();
jest.mock('@privy-io/react-auth', () => ({ usePrivy: () => ({ getAccessToken }) }));
jest.mock('@/lib/onboarding/restartClaimBuild', () => ({ restartClaimBuild: jest.fn() }));

describe('useRestartClaimBuild', () => {
    beforeEach(() => jest.clearAllMocks());

    it('restarts the build with the Privy token', async () => {
        getAccessToken.mockResolvedValueOnce('tok');
        restartClaimBuild.mockResolvedValueOnce(true);
        const { result } = renderHook(() => useRestartClaimBuild('a1'));
        let ok;
        await act(async () => { ok = await result.current(); });
        expect(ok).toBe(true);
        expect(restartClaimBuild).toHaveBeenCalledWith('a1', 'tok');
    });

    it('is false without a token, and sends nothing', async () => {
        getAccessToken.mockResolvedValueOnce(null);
        const { result } = renderHook(() => useRestartClaimBuild('a1'));
        let ok;
        await act(async () => { ok = await result.current(); });
        expect(ok).toBe(false);
        expect(restartClaimBuild).not.toHaveBeenCalled();
    });
});
