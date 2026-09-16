import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
const mockTrackEvent = jest.fn();
jest.mock('@/lib/analytics/trackEvent', () => ({ trackEvent: (...args: unknown[]) => mockTrackEvent(...args) }));

import LatestCards from '../LatestCards';
import type { ArtistLatestItem } from '@/lib/artist/artistLatest';

const release: ArtistLatestItem = { id: 'release:1', kind: 'release', title: 'New record', text: 'Single by Test Artist', date: '2026-08', imageUrl: 'https://cdn.example.com/cover.jpg', imageCaption: 'New record artwork', sourceUrl: 'https://www.deezer.com/album/123', sourceLabel: 'Listen on Deezer' };
const moment: ArtistLatestItem = { id: 'moment:1', kind: 'moment', momentKind: 'video', title: 'studio session 09', text: 'If you watch the full 15 minutes, you’ll recognize the visual theme.\n\n- Dutchyyy', date: '2026-09-09T13:08:00+00:00', imageUrl: 'https://arweave.net/abc', imageCaption: 'studio session 09 artwork', sourceUrl: 'https://www.inprocess.world/collect/base:0xabc/75', sourceLabel: 'Open on In-Process' };
const answer: ArtistLatestItem = { id: 'interview:1', kind: 'interview', title: 'What inspired the record?', text: 'My hometown and its late-night trains.', date: '2026-09-01T12:00:00Z', imageUrl: null, imageCaption: 'Test Artist portrait', sourceUrl: null, sourceLabel: '' };

function setup(items = [answer, release], unavailable = false) {
    return render(<LatestCards items={items} artistName="Test Artist" artistImage="https://cdn.example.com/artist.jpg" unavailable={unavailable} />);
}

it('reports which card kind was opened under which filter', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: `Read ${answer.title}` }));
    expect(mockTrackEvent).toHaveBeenCalledWith('latest_card_open', { kind: 'interview', filter: 'all' });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Releases' }));
    fireEvent.click(screen.getByRole('button', { name: 'Read New record' }));
    expect(mockTrackEvent).toHaveBeenLastCalledWith('latest_card_open', { kind: 'release', filter: 'release' });
});

it('keeps the heading simple and hides the native scrollbar', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Latest' })).toBeInTheDocument();
    expect(screen.queryByText(/The story keeps going/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Music, moments/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Scroll to explore/)).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Latest updates gallery' })).toHaveClass('scrollbar-hide');
});

it('filters by source, opens full text, and links to the actual release', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Releases' }));
    expect(screen.queryByRole('button', { name: `Read ${answer.title}` })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Read New record' }));
    const detail = screen.getByRole('dialog');
    expect(within(detail).getByRole('heading', { name: 'Listen to New record' })).toBeInTheDocument();
    expect(within(detail).getByText('Test Artist')).toBeInTheDocument();
    expect(within(detail).getByRole('link', { name: 'Listen on Deezer' })).toHaveAttribute('href', release.sourceUrl);
    fireEvent.click(within(detail).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('preserves the artist answer and does not invent a source for a static question', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: `Read ${answer.title}` }));
    const detail = screen.getByRole('dialog');
    expect(within(detail).getByText(`“${answer.text}”`)).toBeInTheDocument();
    expect(within(detail).queryByRole('link')).not.toBeInTheDocument();
});

it('recovers a failed contextual image using the artist portrait then the local fallback', () => {
    setup([release]);
    fireEvent.error(screen.getByAltText('New record artwork'));
    expect(screen.getByAltText('Test Artist portrait')).toHaveAttribute('src', 'https://cdn.example.com/artist.jpg');
    fireEvent.error(screen.getByAltText('Test Artist portrait'));
    expect(screen.getByAltText('Test Artist portrait').getAttribute('src')).toMatch(/\/default_pfp_pink\.png$/);
});

it('distinguishes no activity from unavailable activity', () => {
    const view = setup([]);
    expect(screen.getByText(/When Test Artist shares/)).toBeInTheDocument();
    view.rerender(<LatestCards items={[]} artistName="Test Artist" artistImage="" unavailable />);
    expect(screen.getByText(/couldn’t load right now/)).toBeInTheDocument();
});

it('keeps available cards when another source fails', () => {
    setup([answer], true);
    expect(screen.getByRole('status')).toHaveTextContent('Some updates couldn’t load');
    expect(screen.getByRole('button', { name: `Read ${answer.title}` })).toBeInTheDocument();
});

it('keeps every update in one gallery and supports arrow controls and filter reset', () => {
    setup([answer, ...Array.from({ length: 7 }, (_, index) => ({ ...release, id: `release:${index}`, title: `Record ${index}` }))]);
    const gallery = screen.getByRole('region', { name: 'Latest updates gallery' });
    expect(within(gallery).getAllByRole('article')).toHaveLength(8);
    expect(screen.queryByRole('button', { name: /Show all/ })).not.toBeInTheDocument();
    const scrollBy = jest.fn();
    Object.defineProperties(gallery, {
        clientWidth: { configurable: true, value: 700 },
        scrollWidth: { configurable: true, value: 2688 },
        scrollBy: { configurable: true, value: scrollBy },
    });
    jest.spyOn(gallery.firstElementChild!, 'getBoundingClientRect').mockReturnValue({ width: 320 } as DOMRect);
    fireEvent.scroll(gallery);
    expect(screen.getByRole('button', { name: 'Previous updates' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next updates' }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 336 });
    gallery.scrollLeft = 336;
    fireEvent.scroll(gallery);
    fireEvent.click(screen.getByRole('button', { name: 'Previous updates' }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -336 });
    fireEvent.keyDown(gallery, { key: 'ArrowRight' });
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 336 });
    fireEvent.click(screen.getByRole('button', { name: 'In their words' }));
    expect(gallery.scrollLeft).toBe(0);
    expect(within(gallery).getAllByRole('article')).toHaveLength(1);
});

it('opens a flat release picker with logos and no dropdown or artist-only destinations', () => {
    const spotify = { siteName: 'spotify', label: 'Spotify', href: 'https://open.spotify.com/album/2up3OPMp9Tb4dAKM2erWXQ', iconSrc: '/siteIcons/spotify_icon.svg' };
    render(<LatestCards items={[{ ...release, listeningLinks: [spotify] }]} artistName="Test Artist" artistImage="" unavailable={false}
        artistListeningLinks={[{ ...spotify, href: 'https://open.spotify.com/artist/123' }, { siteName: 'bandcamp', label: 'Bandcamp', href: 'https://test.bandcamp.com/', iconSrc: '/siteIcons/bandcamp_icon.svg' }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Read New record' }));
    const detail = screen.getByRole('dialog');
    expect(within(detail).getByRole('link', { name: 'Listen on Spotify' })).toHaveAttribute('href', spotify.href);
    expect(within(detail).getByRole('link', { name: 'Listen on Deezer' })).toHaveAttribute('href', release.sourceUrl);
    expect(within(detail).queryByRole('link', { name: 'Listen on Bandcamp' })).not.toBeInTheDocument();
    expect(within(detail).queryByText('More from Test Artist')).not.toBeInTheDocument();
    expect(detail.querySelector('details')).toBeNull();
    expect(within(detail).queryByText('Single by Test Artist')).not.toBeInTheDocument();
    expect(within(detail).getAllByRole('link')).toHaveLength(2);
});

jest.mock('@/server/utils/queries/artistLatestQueries', () => ({ getArtistLatest: jest.fn() }));

it('carries catalog and approved-source release links through the server section into the actual dialog', async () => {
    const { getArtistLatest } = await import('@/server/utils/queries/artistLatestQueries');
    const { default: LatestSection } = await import('../LatestSection');
    const spotify = { siteName: 'spotify', label: 'Spotify', href: 'https://open.spotify.com/album/2up3OPMp9Tb4dAKM2erWXQ', iconSrc: '/siteIcons/spotify_icon.svg' };
    jest.mocked(getArtistLatest).mockResolvedValue({ items: [{ ...release, listeningLinks: [spotify] }], unavailable: false });
    const appleUrl = 'https://music.apple.com/us/album/new-record/123';
    render(await LatestSection({
        artist: { id: 'artist-1', name: 'Test Artist' } as import('@/server/db/DbTypes').Artist,
        imageUrl: '', sources: [{ title: 'New record by Test Artist', url: appleUrl }], listenLinks: [],
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Read New record' }));
    expect(screen.getByRole('link', { name: 'Listen on Apple Music' })).toHaveAttribute('href', appleUrl);
    expect(screen.getByRole('link', { name: 'Listen on Spotify' })).toHaveAttribute('href', spotify.href);
    expect(screen.getByRole('link', { name: 'Listen on Deezer' })).toHaveAttribute('href', release.sourceUrl);
});

it('shows In-Process moments as Latest cards with their own filter and a link out to the moment', () => {
    setup([answer, moment, release]);
    fireEvent.click(screen.getByRole('button', { name: 'In-Process' }));
    expect(screen.queryByRole('button', { name: `Read ${answer.title}` })).not.toBeInTheDocument();
    const card = screen.getByRole('button', { name: `Read ${moment.title}` });
    expect(within(card).getByText('In-Process')).toBeInTheDocument();
    expect(within(card).getByText('Video')).toBeInTheDocument();
    expect(within(card).getByText('Open on In-Process')).toBeInTheDocument();
    expect(within(card).getByText(/If you watch the full 15 minutes/)).not.toHaveClass('sr-only');
    fireEvent.click(card);
    const detail = screen.getByRole('dialog');
    expect(within(detail).getByRole('heading', { name: moment.title })).toBeInTheDocument();
    expect(within(detail).getByText(/- Dutchyyy$/)).toHaveClass('whitespace-pre-wrap');
    expect(within(detail).getByRole('link', { name: 'Open on In-Process' })).toHaveAttribute('href', moment.sourceUrl);
});

it('falls back to All when the selected filter no longer exists after navigating to another artist', () => {
    const { rerender } = render(<LatestCards items={[answer, moment, release]} artistName="Test Artist" artistImage="https://cdn.example.com/artist.jpg" unavailable={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'In-Process' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    // Client navigation to an artist without moments re-renders the same component with new items.
    rerender(<LatestCards items={[answer, release]} artistName="Other Artist" artistImage="https://cdn.example.com/other.jpg" unavailable={false} />);
    expect(screen.queryByRole('button', { name: 'In-Process' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('article')).toHaveLength(2);
});

it('remounts the cards for a different artist so an open dialog and filter do not carry over on client navigation', async () => {
    const { getArtistLatest } = await import('@/server/utils/queries/artistLatestQueries');
    const { default: LatestSection } = await import('../LatestSection');
    type Artist = import('@/server/db/DbTypes').Artist;
    jest.mocked(getArtistLatest).mockResolvedValue({ items: [answer, moment], unavailable: false });
    const first = await LatestSection({ artist: { id: 'artist-1', name: 'Test Artist' } as Artist, imageUrl: '' });
    const { rerender } = render(first);
    fireEvent.click(screen.getByRole('button', { name: `Read ${moment.title}` }));
    expect(screen.getByRole('dialog')).toHaveTextContent(moment.title);
    // Client navigation to another artist: the page renders the same section with that artist's items.
    jest.mocked(getArtistLatest).mockResolvedValue({ items: [release], unavailable: false });
    rerender(await LatestSection({ artist: { id: 'artist-2', name: 'Other Artist' } as Artist, imageUrl: '' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Read New record' })).toBeInTheDocument();
});
