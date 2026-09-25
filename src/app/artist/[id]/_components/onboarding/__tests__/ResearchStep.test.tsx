// @ts-nocheck
import { render, screen, fireEvent } from '@testing-library/react';
import ResearchStep from '../ResearchStep';

describe('ResearchStep', () => {
    it('shows its title and what it holds', () => {
        render(<ol><ResearchStep state="done" title="found 7 profiles"><p>body</p></ResearchStep></ol>);
        expect(screen.getByText('found 7 profiles')).toBeInTheDocument();
        expect(screen.getByText('body')).toBeInTheDocument();
    });

    it('with onToggle, its title is a button that says whether it is open', () => {
        const onToggle = jest.fn();
        const { rerender } = render(<ol><ResearchStep state="done" title="found 7 profiles" expanded={false} onToggle={onToggle} /></ol>);
        const button = screen.getByRole('button', { name: 'found 7 profiles' });
        expect(button).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(button);
        expect(onToggle).toHaveBeenCalled();
        rerender(<ol><ResearchStep state="done" title="found 7 profiles" expanded onToggle={onToggle} /></ol>);
        expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('without onToggle, its title is plain text', () => {
        render(<ol><ResearchStep state="done" title="found 7 profiles" /></ol>);
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('marks the running step as the current one, and only that one', () => {
        render(<ol><ResearchStep state="active" title="writing your about" /><ResearchStep state="pending" title="later" last /></ol>);
        expect(screen.getByText('writing your about').closest('li')).toHaveAttribute('aria-current', 'step');
        expect(screen.getByText('later').closest('li')).not.toHaveAttribute('aria-current');
    });

    it('names each state for screen readers, since the marker alone is visual', () => {
        render(<ol>
            <ResearchStep state="done" title="a" />
            <ResearchStep state="active" title="b" />
            <ResearchStep state="error" title="c" />
            <ResearchStep state="pending" title="d" last />
        </ol>);
        expect(screen.getByText('done')).toHaveClass('sr-only');
        expect(screen.getByText('in progress')).toHaveClass('sr-only');
        expect(screen.getByText('stopped')).toHaveClass('sr-only');
        expect(screen.getByText('not started')).toHaveClass('sr-only');
    });
});
