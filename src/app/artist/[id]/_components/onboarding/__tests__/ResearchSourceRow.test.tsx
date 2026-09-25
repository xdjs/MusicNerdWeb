// @ts-nocheck
import { render, screen } from '@testing-library/react';
import ResearchSourceRow from '../ResearchSourceRow';

describe('ResearchSourceRow', () => {
    it('shows the title and the domain, and opens the source', () => {
        render(<ul><ResearchSourceRow source={{ title: 'Bio Ritmo', url: 'https://en.wikipedia.org/wiki/Bio_Ritmo', ogImage: null }} /></ul>);
        const link = screen.getByRole('link', { name: /bio ritmo.*en\.wikipedia\.org/i });
        expect(link).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Bio_Ritmo');
    });

    it('uses the domain when there is no title', () => {
        render(<ul><ResearchSourceRow source={{ title: null, url: 'https://rootsworld.com/r', ogImage: null }} /></ul>);
        expect(screen.getAllByText('rootsworld.com').length).toBeGreaterThan(0);
    });
});
