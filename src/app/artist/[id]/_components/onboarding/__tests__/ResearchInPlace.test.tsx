// @ts-nocheck
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResearchInPlace from '../ResearchInPlace';
import { useOnboardingProgress } from '../useOnboardingProgress';

const restart = jest.fn();
jest.mock('../useRestartClaimBuild', () => ({ useRestartClaimBuild: () => restart }));
const startBuild = jest.fn();
jest.mock('../useStartClaimBuild', () => ({ useStartClaimBuild: (id) => startBuild(id) }));
jest.mock('../useOnboardingProgress', () => ({ useOnboardingProgress: jest.fn() }));
jest.mock('../ResearchStatusBar', () => ({
    __esModule: true,
    default: ({ failure, onRetry }) => (
        <div data-testid="pill" data-failure={failure ?? ''}>
            <button onClick={onRetry}>try again</button>
        </div>
    ),
}));

const state = { complete: false, currentStep: 'vault', steps: { profiles: 'x', vault: null, interview: null, publish: null } };
const progress = (over = {}) => ({ steps: state.steps, currentStep: 'vault', complete: false, stalled: false, resetStall: jest.fn(), ...over });

describe('ResearchInPlace', () => {
    beforeEach(() => jest.clearAllMocks());

    it('shows the page under the pill while the server builds it, with no failure', () => {
        useOnboardingProgress.mockReturnValue(progress());
        render(<ResearchInPlace artistId="a1" initialState={state} researchItems={{ links: [], sources: [] }} onComplete={() => {}}><p>page</p></ResearchInPlace>);
        expect(screen.getByText('page')).toBeInTheDocument();
        expect(screen.getByTestId('pill').dataset.failure).toBe('');
    });

    it('kicks off the build for the artist when it opens, in case nothing started it', () => {
        useOnboardingProgress.mockReturnValue(progress());
        render(<ResearchInPlace artistId="a1" initialState={state} researchItems={{ links: [], sources: [] }} onComplete={() => {}} />);
        expect(startBuild).toHaveBeenCalledWith('a1');
    });

    it('offers a retry when the build stalls, which restarts it on the server', async () => {
        const resetStall = jest.fn();
        useOnboardingProgress.mockReturnValue(progress({ stalled: true, resetStall }));
        restart.mockResolvedValueOnce(true);
        render(<ResearchInPlace artistId="a1" initialState={state} researchItems={{ links: [], sources: [] }} onComplete={() => {}} />);
        expect(screen.getByTestId('pill').dataset.failure).toBe('This is taking longer than usual.');
        fireEvent.click(screen.getByText('try again'));
        await waitFor(() => expect(restart).toHaveBeenCalled());
        expect(resetStall).toHaveBeenCalled();
    });

    it('says so when the restart itself fails', async () => {
        useOnboardingProgress.mockReturnValue(progress({ stalled: true }));
        restart.mockResolvedValueOnce(false);
        render(<ResearchInPlace artistId="a1" initialState={state} researchItems={{ links: [], sources: [] }} onComplete={() => {}} />);
        fireEvent.click(screen.getByText('try again'));
        await waitFor(() => expect(screen.getByTestId('pill').dataset.failure).toBe("Couldn't restart the build. Try again in a moment."));
    });
});
