// @ts-nocheck
import { render, screen, act } from '@testing-library/react';
import { Suspense } from 'react';
import ResearchReleases from '../ResearchReleases';

const release = (title, date, imageUrl) => ({ id: title, title, releaseDate: date, imageUrl, url: 'https://www.deezer.com/album/1', kind: 'album', platform: 'deezer' });

describe('ResearchReleases', () => {
    it('shows a cover per release that has artwork, named by title and year', async () => {
        await act(async () => { render(<Suspense fallback={null}><ResearchReleases releases={Promise.resolve([
            release('Largos Caminos', '2025-06-24', 'https://img/1.jpg'),
            release('Oriza', '2016-02-01', 'https://img/2.jpg'),
            release('No Art', '2014', null),
        ])} /></Suspense>); });
        expect(await screen.findByRole('img', { name: 'Largos Caminos (2025)' })).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Oriza (2016)' })).toBeInTheDocument();
        expect(screen.queryByRole('img', { name: /No Art/ })).toBeNull();
        expect(screen.getByText(/your music on deezer/i)).toBeInTheDocument();
    });

    it('shows nothing when there are no covers', async () => {
        let container;
        await act(async () => { ({ container } = render(<Suspense fallback={null}><ResearchReleases releases={Promise.resolve([])} /></Suspense>)); });
        expect(container).toBeEmptyDOMElement();
    });
});
