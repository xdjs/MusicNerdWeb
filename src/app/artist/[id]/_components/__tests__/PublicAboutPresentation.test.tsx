import { fireEvent, render, screen } from '@testing-library/react';
import BlurbSection from '../BlurbSection';
import { useArtistBio } from '@/hooks/useArtistBio';
import { usePrivy } from '@privy-io/react-auth';
import type { PublicArtistAbout } from '@/lib/bio/types';
jest.mock('@/hooks/useArtistBio', () => ({ useArtistBio: jest.fn() }));
jest.mock('@privy-io/react-auth', () => ({ usePrivy: jest.fn() }));
const about: PublicArtistAbout = { bio: 'A musician from Richmond.', kind: 'official', sources: [{ id: 'source', url: 'https://artist.example/bio', label: 'Artist biography' }] };
beforeEach(() => {
 jest.mocked(useArtistBio).mockReturnValue({ bio: about.bio, loading: false, error: null, refetch: jest.fn() });
 jest.mocked(usePrivy).mockReturnValue({ authenticated: true, ready: true } as never);
});
it('reveals short-bio sources through Read more without a second dropdown', () => {
 const { container } = render(<BlurbSection artistId="artist" artistName="Artist" initialBio={about.bio} publicAbout={about} hero portrait/>);
 expect(screen.getByText(about.bio)).toBeInTheDocument();
 expect(screen.queryByText('From the artist’s bio')).not.toBeInTheDocument();
 expect(screen.queryByRole('link', { name: 'Artist biography' })).not.toBeInTheDocument();
 expect(screen.getByRole('button', { name: 'Suggest a correction' })).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button', { name: 'Read more' }));
 expect(screen.getByText('From the artist’s bio')).toBeInTheDocument();
 expect(screen.getByRole('link', { name: 'Artist biography' })).toHaveAttribute('href', 'https://artist.example/bio');
 expect(container.querySelector('details')).toBeNull();
 expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');
 fireEvent.click(screen.getByRole('button', { name: 'Show less' }));
 expect(screen.queryByRole('link', { name: 'Artist biography' })).not.toBeInTheDocument();
});
it('retains attribution when display sanitization removes legacy markdown links', () => {
 render(<BlurbSection artistId="artist" artistName="Artist" initialBio={about.bio} publicAbout={{ ...about, bio: `${about.bio} ([Source](https://artist.example/bio))` }} hero/>);
 fireEvent.click(screen.getByRole('button', { name: 'Read more' }));
 expect(screen.getByText('From the artist’s bio')).toBeInTheDocument();
});
it('does not attribute an artist edit to the previous source preparation', () => {
 jest.mocked(useArtistBio).mockReturnValue({ bio: 'The artist edited this.', loading: false, error: null, refetch: jest.fn() });
 render(<BlurbSection artistId="artist" artistName="Artist" initialBio="The artist edited this." publicAbout={about} hero/>);
 expect(screen.queryByText('From the artist’s bio')).not.toBeInTheDocument();
});
it('discards an open report drafted against an older bio after a profile refresh', () => {
 const { rerender } = render(<BlurbSection artistId="artist" artistName="Artist" initialBio={about.bio} hero/>);
 fireEvent.click(screen.getByRole('button', { name: 'Suggest a correction' }));
 fireEvent.change(screen.getByLabelText(/Details/), { target: { value: 'About the old biography' } });
 jest.mocked(useArtistBio).mockReturnValue({ bio: 'A revised biography.', loading: false, error: null, refetch: jest.fn() });
 rerender(<BlurbSection artistId="artist" artistName="Artist" initialBio="A revised biography." hero/>);
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button', { name: 'Suggest a correction' }));
 expect(screen.getByLabelText(/Details/)).toHaveValue('');
});
it('withdraws the About actions and citations when eligible bio is empty', () => {
 jest.mocked(useArtistBio).mockReturnValue({ bio: '', loading: false, error: null, refetch: jest.fn() });
 render(<BlurbSection artistId="artist" artistName="Artist" initialBio="" publicAbout={null} hero/>);
 expect(screen.queryByRole('button', { name: 'Suggest a correction' })).not.toBeInTheDocument();
 expect(screen.queryByText('Sources')).not.toBeInTheDocument();
});

it('expands a long researched bio and its sources together', () => {
 const bio = 'A musician making records in Richmond. '.repeat(10);
 jest.mocked(useArtistBio).mockReturnValue({ bio, loading: false, error: null, refetch: jest.fn() });
 render(<BlurbSection artistId="artist" artistName="Artist" initialBio={bio} publicAbout={{ ...about, bio, kind: 'researched' }} hero/>);
 expect(screen.queryByText('Researched from public sources')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button', { name: 'Read more' }));
 expect(screen.getByText('Researched from public sources')).toBeInTheDocument();
 expect(screen.getByRole('link', { name: 'Artist biography' })).toBeInTheDocument();
 expect(screen.getByRole('button', { name: 'Suggest a correction' })).toBeInTheDocument();
});
