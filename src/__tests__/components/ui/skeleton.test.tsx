import { render } from '@testing-library/react';
import { Skeleton } from '@/components/ui/skeleton';

describe('Skeleton', () => {
    it('renders a placeholder block that pulses only when motion is allowed', () => {
        const { container } = render(<Skeleton />);
        const block = container.firstElementChild;
        expect(block).toHaveClass('rounded-md', 'bg-black/10', 'dark:bg-white/10', 'motion-safe:animate-pulse');
        expect(block).not.toHaveClass('animate-pulse');
    });

    it('lets the caller override its shape and passes attributes through', () => {
        const { container } = render(<Skeleton className="h-12 w-12 rounded-full" data-skeleton="tile" />);
        const block = container.firstElementChild;
        expect(block).toHaveClass('h-12', 'w-12', 'rounded-full');
        expect(block).not.toHaveClass('rounded-md');
        expect(block).toHaveAttribute('data-skeleton', 'tile');
    });
});
