import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Dashboard from '../Dashboard';
import type { User } from '@/server/db/DbTypes';

jest.mock('next-auth/react', () => ({ useSession: () => ({ status: 'authenticated' }) }));
jest.mock('../Wrapper', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('../Leaderboard', () => ({ __esModule: true, default: () => <div>Leaderboard</div> }));
jest.mock('../UserEntriesTable', () => ({ __esModule: true, default: () => <h2>Contribution history</h2> }));
jest.mock('@/app/actions/serverActions', () => ({ getUgcStatsInRangeAction: jest.fn().mockResolvedValue({ ugcCount: 2, artistsCount: 1 }) }));
const user = { id: 'profile-test', username: 'Music fan', wallet: 'wallet-test', isHidden: false } as User;

beforeEach(() => {
  localStorage.clear();
  jest.spyOn(global, 'fetch').mockImplementation(async input => ({
    ok: true,
    json: async () => String(input).includes('ugcCount') ? { count: 2 } : [],
  } as Response));
});
afterEach(() => jest.restoreAllMocks());

it('keeps contribution actions and username editing available without a music connection', async () => {
  const openArtist = jest.fn();
  render(<><button aria-label="Add new artist" onClick={openArtist}>+</button><Dashboard user={user} allowEditUsername showLeaderboard={false} /></>);
  expect(await screen.findByRole('heading', { name: 'Music fan' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Contribution history' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Find an artist/ })).toHaveAttribute('href', '/');
  fireEvent.click(screen.getByRole('button', { name: 'Add an artist' }));
  expect(openArtist).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Edit username' }));
  expect(screen.getByLabelText('Username')).toHaveValue('Music fan');
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'Unsaved' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit username' }));
  expect(screen.getByLabelText('Username')).toHaveValue('Music fan');
  expect(screen.queryByText(/Connect Spotify|MusicNerd TV/)).not.toBeInTheDocument();
});

it('renders existing browser bookmarks and preserves artist destinations and editing', async () => {
  localStorage.setItem('bookmarks_profile-test', JSON.stringify([{ artistId: 'artist-one', artistName: 'Saved artist', imageUrl: null }]));
  render(<Dashboard user={user} allowEditUsername showLeaderboard={false} />);
  expect(await screen.findByRole('link', { name: 'Saved artist' })).toHaveAttribute('href', '/artist/artist-one');
  fireEvent.click(screen.getByRole('button', { name: 'Edit collection' }));
  expect(screen.getByRole('button', { name: 'Remove Saved artist' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(screen.queryByRole('button', { name: 'Remove Saved artist' })).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('bookmarks_profile-test')!)[0].artistId).toBe('artist-one');
});
