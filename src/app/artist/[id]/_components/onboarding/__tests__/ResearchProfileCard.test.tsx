// @ts-nocheck
import { render, screen } from '@testing-library/react';
import ResearchProfileCard from '../ResearchProfileCard';

const spotify = { siteName: 'spotify', displayName: 'Spotify', value: 'Bio Ritmo', profileUrl: 'https://open.spotify.com/artist/x', logoUrl: 'https://img/spotify.svg', previewImage: 'https://img/bio.jpg' };

describe('ResearchProfileCard', () => {
    it('shows the profile image, the platform and the handle, and opens the profile', () => {
        const { container } = render(<ul><ResearchProfileCard profile={spotify} /></ul>);
        const link = screen.getByRole('link', { name: /spotify.*bio ritmo/i });
        expect(link).toHaveAttribute('href', 'https://open.spotify.com/artist/x');
        expect(link).toHaveAttribute('target', '_blank');
        expect(container.querySelector('img[src="https://img/bio.jpg"]')).not.toBeNull();
        expect(container.querySelector('img[src="https://img/spotify.svg"]')).not.toBeNull();
    });

    it('without a profile URL it is plain text, and without images it shows the first letter', () => {
        const { container } = render(<ul><ResearchProfileCard profile={{ ...spotify, siteName: 'discogs', displayName: 'Discogs', value: '333934', profileUrl: null, logoUrl: null, previewImage: null }} /></ul>);
        expect(screen.queryByRole('link')).toBeNull();
        expect(container.querySelector('img')).toBeNull();
        expect(container).toHaveTextContent('d');
        expect(container).toHaveTextContent('333934');
    });
});
