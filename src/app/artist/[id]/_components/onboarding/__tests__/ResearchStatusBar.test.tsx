// @ts-nocheck
import { render, screen, fireEvent } from '@testing-library/react';
import ResearchStatusBar from '../ResearchStatusBar';

describe('ResearchStatusBar', () => {
    it('names the current step and offers skip', () => {
        const onSkip = jest.fn();
        render(<ResearchStatusBar step="Finding your profiles" failure={null} onSkip={onSkip} onRetry={jest.fn()} />);
        expect(screen.getByText(/finding your profiles/i)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));
        expect(onSkip).toHaveBeenCalled();
    });

    it('on a failure, says so and offers try again instead', () => {
        const onRetry = jest.fn();
        render(<ResearchStatusBar step="Writing your About" failure="Could not publish your About and Lore." onSkip={jest.fn()} onRetry={onRetry} />);
        expect(screen.getByRole('alert')).toHaveTextContent('Could not publish your About and Lore.');
        fireEvent.click(screen.getByRole('button', { name: /try again/i }));
        expect(onRetry).toHaveBeenCalled();
    });

    it('announces the step politely to screen readers', () => {
        render(<ResearchStatusBar step="Finding your profiles" failure={null} onSkip={jest.fn()} onRetry={jest.fn()} />);
        expect(screen.getByText(/finding your profiles/i).closest('[aria-live]')).toHaveAttribute('aria-live', 'polite');
    });
});
