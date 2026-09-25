// @ts-nocheck
import { render, screen } from '@testing-library/react';
import ResearchSourceCard from '../ResearchSourceCard';

describe('ResearchSourceCard', () => {
    it('shows the share image, the domain above the title, and opens the source', () => {
        const { container } = render(<ul><ResearchSourceCard source={{ title: 'Bio Ritmo Profile and History', url: 'https://www.richmondmagazine.com/x', ogImage: 'https://img/og.jpg' }} /></ul>);
        const link = screen.getByRole('link', { name: /richmondmagazine\.com.*bio ritmo profile and history/i });
        expect(link).toHaveAttribute('href', 'https://www.richmondmagazine.com/x');
        expect(link).toHaveAttribute('target', '_blank');
        expect(container.querySelector('img')).toHaveAttribute('src', 'https://img/og.jpg');
    });

    it('drops a share image that fails to load, keeping the text', () => {
        const { container } = render(<ul><ResearchSourceCard source={{ title: 'T', url: 'https://a.com/1', ogImage: 'https://img/og.jpg' }} /></ul>);
        container.querySelector('img').dispatchEvent(new Event('error'));
        expect(screen.getByText('T')).toBeInTheDocument();
    });
});
