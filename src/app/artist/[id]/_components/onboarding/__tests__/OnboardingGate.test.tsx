// @ts-nocheck
// `jest` stays the ambient global (no '@jest/globals' import) so jest.mock() hoists
// above the static OnboardingGate import; see ClientWrapper.test.tsx.
import { render, screen, fireEvent } from '@testing-library/react';
import OnboardingGate from '../OnboardingGate';
import { tourPendingKey } from '../tourPendingKey';
import { tourFlagKey } from '../tourFlagKey';

jest.mock('../ResearchInPlace', () => ({
    __esModule: true,
    default: ({ initialState, researchItems, onComplete, children }) => (
        <div data-testid="research-in-place" data-initial-step={initialState?.currentStep} data-links={researchItems?.links.join(',')}>
            <button onClick={onComplete}>build complete</button>
            <div data-testid="passed-page">{children}</div>
        </div>
    ),
}));

const at = (currentStep) => ({ complete: false, currentStep, steps: { profiles: null, vault: null, interview: null, publish: null } });
const done = { complete: true, currentStep: null, steps: { profiles: 'x', vault: 'x', interview: 'x', publish: 'x' } };

describe('OnboardingGate', () => {
    beforeEach(() => sessionStorage.clear());

    it('paints the build in place over the page, with no popup, while the server builds it', () => {
        render(<OnboardingGate artistId="a1" state={at('vault')} researchItems={{ links: ['spotify'], sources: [] }}><p>page</p></OnboardingGate>);
        const view = screen.getByTestId('research-in-place');
        expect(view.dataset.initialStep).toBe('vault');
        expect(view.dataset.links).toBe('spotify');
        expect(screen.getByTestId('passed-page')).toHaveTextContent('page');
        expect(screen.queryByText(/set up/i)).not.toBeInTheDocument();
    });

    it('renders just the page when it arrived built', () => {
        render(<OnboardingGate artistId="a1" state={done}><p>page</p></OnboardingGate>);
        expect(screen.queryByTestId('research-in-place')).not.toBeInTheDocument();
        expect(screen.getByText('page')).toBeInTheDocument();
    });

    it('arms the tour once when the build finishes during the visit', () => {
        render(<OnboardingGate artistId="a1" state={at('profiles')} />);
        fireEvent.click(screen.getByText('build complete'));
        expect(sessionStorage.getItem(tourPendingKey('a1'))).toBe('1');
    });

    it('does not re-arm a tour already finished this session', () => {
        sessionStorage.setItem(tourFlagKey('a1'), '1');
        render(<OnboardingGate artistId="a1" state={at('profiles')} />);
        fireEvent.click(screen.getByText('build complete'));
        expect(sessionStorage.getItem(tourPendingKey('a1'))).toBeNull();
    });
});
