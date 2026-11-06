// @ts-nocheck
import { renderHook, waitFor } from '@testing-library/react';
import { useStartClaimBuild } from '../useStartClaimBuild';
import { restartClaimBuild } from '@/lib/onboarding/restartClaimBuild';

const privy = { ready: true, authenticated: true, getAccessToken: jest.fn() };
jest.mock('@privy-io/react-auth', () => ({ usePrivy: () => privy }));
jest.mock('@/lib/onboarding/restartClaimBuild', () => ({ restartClaimBuild: jest.fn().mockResolvedValue(true) }));

describe('useStartClaimBuild', () => {
    beforeEach(() => { jest.clearAllMocks(); Object.assign(privy, { ready: true, authenticated: true }); });

    it('starts the build once, as the signed-in claimant', async () => {
        privy.getAccessToken.mockResolvedValue('tok');
        const { rerender } = renderHook(() => useStartClaimBuild('a1'));
        rerender();
        await waitFor(() => expect(restartClaimBuild).toHaveBeenCalledWith('a1', 'tok'));
        rerender();
        expect(restartClaimBuild).toHaveBeenCalledTimes(1);
    });

    it('waits for sign-in to be ready', async () => {
        Object.assign(privy, { ready: false });
        privy.getAccessToken.mockResolvedValue('tok');
        const { rerender } = renderHook(() => useStartClaimBuild('a1'));
        expect(restartClaimBuild).not.toHaveBeenCalled();
        Object.assign(privy, { ready: true });
        rerender();
        await waitFor(() => expect(restartClaimBuild).toHaveBeenCalledTimes(1));
    });

    it('sends nothing without a token', async () => {
        privy.getAccessToken.mockResolvedValue(null);
        renderHook(() => useStartClaimBuild('a1'));
        await new Promise(r => setTimeout(r, 0));
        expect(restartClaimBuild).not.toHaveBeenCalled();
    });
});
