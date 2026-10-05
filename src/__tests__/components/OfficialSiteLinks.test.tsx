// @ts-nocheck
import { render, screen } from '@testing-library/react';
import OfficialSiteLinks from '@/app/artist/[id]/_components/OfficialSiteLinks';

describe('OfficialSiteLinks', () => {
    const site = { id: 's1', url: 'https://www.novareyesmusic.com/', title: 'Nova Reyes — Official Site', type: 'website', status: 'approved' };
    const article = { id: 's2', url: 'https://pitchfork.com/review', title: 'A review', type: 'article', status: 'approved' };

    it('renders an approved website source as a link to the artist\'s own site', () => {
        render(<OfficialSiteLinks artistId="a1" sources={[site]} />);
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', 'https://www.novareyesmusic.com/');
        // Label is the bare host — "www." stripped so it reads as a brand, not a URL.
        expect(link).toHaveTextContent('novareyesmusic.com');
    });

    it('ignores sources that are not the artist\'s site, so press stays in the press section', () => {
        render(<OfficialSiteLinks artistId="a1" sources={[article]} />);
        expect(screen.queryByRole('link')).toBeNull();
    });

    it('picks only the website entries out of a mixed list', () => {
        render(<OfficialSiteLinks artistId="a1" sources={[article, site]} />);
        const links = screen.getAllByRole('link');
        expect(links).toHaveLength(1);
        expect(links[0]).toHaveAttribute('href', 'https://www.novareyesmusic.com/');
    });

    it('renders nothing at all when there is no website source', () => {
        const { container } = render(<OfficialSiteLinks artistId="a1" sources={[]} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('opens in a new tab without leaking the referrer', () => {
        render(<OfficialSiteLinks artistId="a1" sources={[site]} />);
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    });

    it('omits malformed destination URLs rather than producing an unsafe link', () => {
        render(<OfficialSiteLinks artistId="a1" sources={[{ id: 's3', url: 'not-a-url', type: 'website' }]} />);
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
});
