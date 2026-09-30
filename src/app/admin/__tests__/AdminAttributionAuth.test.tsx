jest.mock('@/server/auth', () => ({ getServerAuthSession: jest.fn() }));
jest.mock('@/server/utils/queries/userQueries', () => ({ getUserById: jest.fn(), getAllUsers: jest.fn() }));
jest.mock('@/server/utils/activity/getArtistActivity', () => ({ getArtistActivity: jest.fn() }));
jest.mock('@/server/utils/queries/getPendingLoreSources', () => ({ getPendingLoreSources: jest.fn() }));
jest.mock('../AdminDashboard', () => () => null);
jest.mock('next/navigation', () => ({ redirect: jest.fn(() => { throw new Error('redirect'); }) }));
import Admin from '../page';
import { getServerAuthSession } from '@/server/auth';
import { getUserById } from '@/server/utils/queries/userQueries';
import { getArtistActivity } from '@/server/utils/activity/getArtistActivity';
import { getPendingLoreSources } from '@/server/utils/queries/getPendingLoreSources';
it.each([null, {user: {id: 'regular-user'}}])('does not load actor details for unauthorized sessions (%s)', async session => {
  jest.clearAllMocks();
  (getServerAuthSession as jest.Mock).mockResolvedValue(session);
  (getUserById as jest.Mock).mockResolvedValue({ isAdmin: false });
  await expect(Admin({ searchParams: Promise.resolve({ section: 'activity' }) })).rejects.toThrow('redirect');
  expect(getArtistActivity).not.toHaveBeenCalled();
  expect(getPendingLoreSources).not.toHaveBeenCalled();
});
