// @ts-nocheck
// NOTE: intentionally NOT `import { jest } from '@jest/globals'` here. This repo's
// SWC-based next/jest transform only hoists `jest.mock()` above ES `import`
// statements when `jest` is the ambient global — importing `jest` from
// '@jest/globals' disables that hoisting, so `jest.mock('../OnboardingChat', ...)`
// below would run AFTER `OnboardingGate` (and its transitive import of the real
// OnboardingChat) has already been required, and the mock silently never applies.
// Confirmed empirically: reordering `jest.mock()` before the static `OnboardingGate`
// import (the pattern used in `src/app/_components/__tests__/ActivityFeed.test.tsx`,
// which keeps the `@jest/globals` import) does NOT fix it for this file — that
// precedent isn't actually proof the mock takes effect there, since the real
// `next/link` would render the same href-bearing `<a>` its mock does. `jest` is
// globally available in the Jest environment, so dropping this import changes
// nothing about test behavior; it only restores mock hoisting. See
// `src/app/profile/__tests__/ClientWrapper.test.tsx` for the same working pattern.
import { render, screen, fireEvent } from '@testing-library/react';
import OnboardingGate, { skipFlagKey } from '../OnboardingGate';

jest.mock('../OnboardingChat', () => ({
    __esModule: true,
    default: ({ onSkip, onFinish, children }) => (
        <div data-testid="onboarding-chat">
            <button onClick={onSkip}>skip</button>
            <button onClick={onFinish}>finish</button>
            <div data-testid="passed-page">{children}</div>
        </div>
    ),
}));

describe('OnboardingGate', () => {
    beforeEach(() => sessionStorage.clear());

    it('opens the chat takeover when there is no skip flag', () => {
        render(<OnboardingGate artistId="a1" artistName="Nova Reyes" currentStep="profiles" />);
        expect(screen.getByTestId('onboarding-chat')).toBeInTheDocument();
    });

    it('shows the banner instead when the session skip flag is set', () => {
        sessionStorage.setItem(skipFlagKey('a1'), '1');
        render(<OnboardingGate artistId="a1" artistName="Nova Reyes" currentStep="vault" />);
        expect(screen.queryByTestId('onboarding-chat')).not.toBeInTheDocument();
        expect(screen.getByText(/finish setting up/i)).toBeInTheDocument();
    });

    it('skipping sets the flag and swaps to the banner; banner CTA reopens the chat', () => {
        render(<OnboardingGate artistId="a1" artistName="Nova Reyes" currentStep="profiles" />);
        fireEvent.click(screen.getByText('skip'));
        expect(sessionStorage.getItem(skipFlagKey('a1'))).toBe('1');
        expect(screen.getByText(/finish setting up/i)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /continue/i }));
        expect(screen.getByTestId('onboarding-chat')).toBeInTheDocument();
    });

    it('banner copy frames the next step as the next win (never shame)', () => {
        sessionStorage.setItem(skipFlagKey('a1'), '1');
        render(<OnboardingGate artistId="a1" artistName="Nova Reyes" currentStep="interview" />);
        expect(screen.getByText(/tell us your story/i)).toBeInTheDocument();
    });

    it('finishing closes the takeover WITHOUT setting the skip flag (no banner flash on a real finish)', () => {
        render(<OnboardingGate artistId="a1" artistName="Nova Reyes" currentStep="publish" />);
        fireEvent.click(screen.getByText('finish'));
        expect(sessionStorage.getItem(skipFlagKey('a1'))).toBeNull();
        expect(screen.queryByTestId('onboarding-chat')).not.toBeInTheDocument();
        expect(screen.queryByText(/finish setting up/i)).not.toBeInTheDocument();
    });

    // The research view replaces the artist page below the app's own nav, so the
    // gate owns the page: it hands it to the chat (which decides whether to show
    // it) and shows it itself around the banner and once onboarding closes.
    it('hands the artist page to the chat while onboarding runs', () => {
        render(<OnboardingGate artistId="a1" artistName="Nova Reyes" currentStep="profiles"><p>artist page</p></OnboardingGate>);
        expect(screen.getByTestId('passed-page')).toHaveTextContent('artist page');
    });

    it('shows the artist page under the banner, and after a real finish', () => {
        sessionStorage.setItem(skipFlagKey('a1'), '1');
        const { unmount } = render(<OnboardingGate artistId="a1" artistName="Nova Reyes" currentStep="vault"><p>artist page</p></OnboardingGate>);
        expect(screen.getByText('artist page')).toBeInTheDocument();
        unmount();
        sessionStorage.clear();
        render(<OnboardingGate artistId="a1" artistName="Nova Reyes" currentStep="publish"><p>artist page</p></OnboardingGate>);
        fireEvent.click(screen.getByText('finish'));
        expect(screen.getByText('artist page')).toBeInTheDocument();
        expect(screen.queryByTestId('onboarding-chat')).not.toBeInTheDocument();
    });
});
