import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
    it('renders the default variant', () => {
        render(<Badge>label</Badge>);
        expect(screen.getByText('label')).toHaveClass('bg-primary', 'text-primary-foreground');
    });

    it('renders the highlight variant: pink with bold black text', () => {
        render(<Badge variant="highlight">3 new</Badge>);
        const badge = screen.getByText('3 new');
        expect(badge).toHaveClass('bg-highlightpink', 'text-black', 'font-bold', 'border-transparent');
        expect(badge).not.toHaveClass('font-semibold');
    });
});
