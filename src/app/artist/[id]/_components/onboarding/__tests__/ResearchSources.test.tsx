// @ts-nocheck
import { render, screen } from '@testing-library/react';
import ResearchSources from '../ResearchSources';

const withImage = (n) => ({ title: `Feature ${n}`, url: `https://mag${n}.com/a`, ogImage: `https://img/${n}.jpg` });
const plain = (n) => ({ title: `Note ${n}`, url: `https://site${n}.org/b`, ogImage: null });

describe('ResearchSources', () => {
    it('shows up to three share-image cards, then up to four rows, and the total with the rest in the lore', () => {
        const sources = [plain(1), withImage(1), withImage(2), withImage(3), withImage(4), plain(2), plain(3), plain(4), plain(5), plain(6)];
        render(<ResearchSources sources={sources} total={17} collapsed={false} />);
        expect(screen.getByRole('list', { name: /sources with images/i }).querySelectorAll(':scope > li')).toHaveLength(3);
        expect(screen.getByRole('list', { name: /more sources/i }).querySelectorAll(':scope > li')).toHaveLength(4);
        expect(screen.getByText('17 sources in all. 10 more are in your lore, where you can keep or remove each one.')).toBeInTheDocument();
    });

    it('says only the total when every source is shown, and nothing before the stage ends', () => {
        const { rerender } = render(<ResearchSources sources={[plain(1)]} total={1} collapsed={false} />);
        expect(screen.getByText('1 source in all.')).toBeInTheDocument();
        rerender(<ResearchSources sources={[plain(1)]} total={null} collapsed={false} />);
        expect(screen.queryByText(/in all/)).toBeNull();
    });

    it('collapsed, it is a thumbnail stack and the domains', () => {
        render(<ResearchSources sources={[withImage(1), withImage(2), plain(1), plain(2), plain(3)]} total={5} collapsed />);
        expect(screen.queryByRole('list')).toBeNull();
        expect(screen.getByText('mag1.com, mag2.com, site1.org and 2 more')).toBeInTheDocument();
    });
});
