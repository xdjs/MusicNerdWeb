import { releaseListeningLinks } from '../releaseListeningLinks';
import type { ArtistLatestItem } from '../artistLatest';
const item: ArtistLatestItem = { id: 'release:1', kind: 'release', title: 'Unfinished Hugs', text: '', date: '2024-07-16', imageUrl: null, imageCaption: '', sourceUrl: 'https://www.deezer.com/album/123', sourceLabel: 'Listen on Deezer', listeningLinks: [{ siteName: 'spotify', label: 'Spotify', href: 'https://open.spotify.com/album/2up3OPMp9Tb4dAKM2erWXQ', iconSrc: '' }] };
it('adds matching approved release pages across supported services, deduplicating the catalog source', () => {
    const links = releaseListeningLinks(item, 'Dutchyyy', [
        { title: 'Unfinished Hugs - Single by Dutchyyy', url: 'https://music.apple.com/us/album/unfinished-hugs/123' },
        { title: 'Unfinished Hugs | Dutchyyy', url: 'https://dutchyyy.bandcamp.com/album/unfinished-hugs' },
        { title: 'Unfinished Hugs', url: 'https://soundcloud.com/dutchyyy/unfinished-hugs' },
        { title: 'Unfinished Hugs', url: 'https://www.deezer.com/album/123' },
    ]);
    expect(links.map(link => link.siteName)).toEqual(['spotify', 'deezer', 'applemusic', 'bandcamp', 'soundcloud']);
    expect(links.every(link => link.iconSrc)).toBe(true);
});
it('excludes unrelated titles, artist pages, hostile URLs and an album URL pointing to a different individual track', () => {
    const links = releaseListeningLinks(item, 'Dutchyyy', [
        { title: 'Unfinished Hugs (Deluxe)', url: 'https://dutchyyy.bandcamp.com/album/deluxe' },
        { title: 'Unfinished Hugs', url: 'https://music.apple.com/us/artist/dutchyyy/1' },
        { title: 'Unfinished Hugs', url: 'https://music.apple.com.evil.test/us/album/unfinished-hugs/1' },
        { title: 'Unfinished Hugs', url: 'https://music.apple.com/us/album/unfinished-hugs/1?i=2' },
        { title: 'Unfinished Hugs', url: 'javascript:alert(1)' },
        { title: 'Unfinished Hugs', url: 'https://user:secret@dutchyyy.bandcamp.com/album/unfinished-hugs' },
        { title: 'Unfinished Hugs', url: 'https://soundcloud.com/dutchyyy/likes' },
        { title: 'Unfinished Hugs', url: 'https://inprocess.to/collection/123' },
    ]);
    expect(links.map(link => link.siteName)).toEqual(['spotify', 'deezer']);
});
it('accepts an approved release beneath a saved supported artist profile without inventing a path', () => {
    const profile = { siteName: 'subvert', label: 'Subvert', href: 'https://subvert.fm/dutchyyy', iconSrc: '/siteIcons/subvert_icon.jpg' };
    const links = releaseListeningLinks(item, 'Dutchyyy', [
        { title: 'Unfinished Hugs', url: 'https://subvert.fm/dutchyyy/releases/unfinished-hugs' },
        { title: 'Unfinished Hugs', url: 'https://subvert.fm/another-artist/releases/unfinished-hugs' },
    ], [profile]);
    expect(links.filter(link => link.siteName === 'subvert')).toEqual([{ ...profile, href: 'https://subvert.fm/dutchyyy/releases/unfinished-hugs' }]);
    expect(releaseListeningLinks({ ...item, kind: 'instagram' }, 'Dutchyyy')).toEqual([]);
});
