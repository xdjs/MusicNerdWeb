import { render, screen } from '@testing-library/react';
import Admin from '../page';
import { getServerAuthSession } from '@/server/auth';
import { getAllUsers, getUserById } from '@/server/utils/queries/userQueries';
import { getAllClaims } from '@/server/utils/queries/dashboardQueries';
import { getAllMcpKeys } from '@/server/utils/queries/mcpKeyQueries';
import { getAdminReviewQueue } from '@/server/utils/contributions/getAdminReviewQueue';
import { getArtistActivity } from '@/server/utils/activity/getArtistActivity';

jest.mock('@/server/auth', () => ({ getServerAuthSession: jest.fn() }));
jest.mock('@/server/utils/queries/userQueries', () => ({ getUserById: jest.fn(), getAllUsers: jest.fn() }));
jest.mock('@/server/utils/queries/dashboardQueries', () => ({ getAllClaims: jest.fn() }));
jest.mock('@/server/utils/queries/mcpKeyQueries', () => ({ getAllMcpKeys: jest.fn() }));
jest.mock('@/server/utils/contributions/getAdminReviewQueue', () => ({ getAdminReviewQueue: jest.fn() }));
jest.mock('@/server/utils/activity/getArtistActivity', () => ({ getArtistActivity: jest.fn() }));
jest.mock('@/app/actions/serverActions', () => ({ approveUgcAdminAction: jest.fn() }));
jest.mock('@/app/actions/dashboardActions', () => ({ updateSourceStatus: jest.fn() }));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  redirect: jest.fn(() => { throw new Error('redirect'); }),
}));

const reads = [getAdminReviewQueue, getAllUsers, getAllMcpKeys, getAllClaims, getArtistActivity];

beforeEach(() => {
  jest.clearAllMocks();
  (getServerAuthSession as jest.Mock).mockResolvedValue({ user: { id: 'admin' } });
  (getUserById as jest.Mock).mockResolvedValue({ isAdmin: true });
  (getAllUsers as jest.Mock).mockResolvedValue([]);
  (getAllClaims as jest.Mock).mockResolvedValue([]);
  (getAllMcpKeys as jest.Mock).mockResolvedValue([]);
  (getAdminReviewQueue as jest.Mock).mockResolvedValue({
    items: [], counts: { links: 0, sources: 0, corrections: 0 },
    pendingCounts: { links: 0, sources: 0, corrections: 0 },
    total: 0, page: 1, pageSize: 25, type: 'all', query: '',
  });
  (getArtistActivity as jest.Mock).mockResolvedValue({
    items: [], total: 0, page: 1, pageSize: 25, query: '', action: '', eventId: '',
  });
});

it.each([
  ['claims', 'Artist claims', 'Connect artists with their pages'],
  ['users', 'People', 'The people building Music Nerd'],
  ['activity', 'Activity', 'Who started this work'],
  ['lore', 'Lore review', 'Lore review'],
  ['ugc', 'Lore review', 'Lore review'],
  ['corrections', 'Lore review', 'Lore review'],
  ['unknown', 'Lore review', 'Lore review'],
  ['', 'Lore review', 'Lore review'],
  [undefined, 'Lore review', 'Lore review'],
  [['claims', 'users'], 'Artist claims', 'Connect artists with their pages'],
  [['users', 'claims'], 'People', 'The people building Music Nerd'],
  [[], 'Lore review', 'Lore review'],
])('routes section %j through the page, dashboard and tabs', async (section, label, heading) => {
  const view = render(await Admin({ searchParams: Promise.resolve({ section }) }));
  expect(screen.getByRole('tab', { name: new RegExp(`^${label}`) })).toHaveAttribute('data-state', 'active');
  expect(screen.getByRole('combobox', { name: 'Admin section' })).toHaveTextContent(label);
  expect(screen.getByRole('heading', { name: heading })).toBeVisible();
  // A new server render/remount models reloading the same URL, without retained tab state.
  view.unmount();
  render(await Admin({ searchParams: Promise.resolve({ section }) }));
  expect(screen.getByRole('tab', { name: new RegExp(`^${label}`) })).toHaveAttribute('data-state', 'active');
});

it.each([['ugc', 'links'], ['corrections', 'corrections']])('preserves legacy %s review filtering', async (section, type) => {
  await Admin({ searchParams: Promise.resolve({ section, loreQuery: 'artist', lorePage: '2' }) });
  expect(getAdminReviewQueue).toHaveBeenCalledWith({ type, query: 'artist', page: 2 });
});

it('preserves explicit review filters over legacy defaults', async () => {
  await Admin({ searchParams: Promise.resolve({ section: 'ugc', reviewType: 'sources', reviewQuery: 'new', loreQuery: 'old', reviewPage: '3', lorePage: '2' }) });
  expect(getAdminReviewQueue).toHaveBeenCalledWith({ type: 'sources', query: 'new', page: 3 });
});

it.each(['signed out', 'non-admin', 'missing user'])('denies claims and performs no dashboard reads for %s', async state => {
  if (state === 'signed out') (getServerAuthSession as jest.Mock).mockResolvedValue(null);
  (getUserById as jest.Mock).mockResolvedValue(state === 'missing user' ? null : { isAdmin: false });
  await expect(Admin({ searchParams: Promise.resolve({ section: 'claims' }) })).rejects.toThrow('redirect');
  for (const read of reads) expect(read).not.toHaveBeenCalled();
  if (state === 'signed out') expect(getUserById).not.toHaveBeenCalled();
});
