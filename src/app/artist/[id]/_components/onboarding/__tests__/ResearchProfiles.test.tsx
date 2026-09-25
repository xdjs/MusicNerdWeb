// @ts-nocheck
import { render, screen } from '@testing-library/react';
import ResearchProfiles from '../ResearchProfiles';

const profile = (siteName) => ({ siteName, displayName: siteName[0].toUpperCase() + siteName.slice(1), value: `bio-${siteName}`, profileUrl: null, logoUrl: null, previewImage: `https://img/${siteName}.jpg` });
const seven = ['spotify', 'youtube', 'bandcamp', 'soundcloud', 'instagram', 'facebook', 'discogs'].map(profile);

describe('ResearchProfiles', () => {
    it('shows a card per profile, and the refused-platforms sentence under them', () => {
        render(<ResearchProfiles profiles={seven} note="instagram wouldn’t let us look just now" collapsed={false} />);
        expect(screen.getByRole('list', { name: /profiles/i }).querySelectorAll(':scope > li')).toHaveLength(7);
        expect(screen.getByText('bio-discogs')).toBeInTheDocument();
        expect(screen.getByText(/instagram wouldn’t let us look/)).toBeInTheDocument();
    });

    it('collapsed, it is a stack of their images and a one-line summary', () => {
        const { container } = render(<ResearchProfiles profiles={seven} note={null} collapsed />);
        expect(screen.queryByRole('list', { name: /profiles/i })).toBeNull();
        expect(screen.getByText('spotify, youtube, bandcamp, soundcloud and 3 more')).toBeInTheDocument();
        expect(container.querySelectorAll('img')).toHaveLength(4);
    });
});
