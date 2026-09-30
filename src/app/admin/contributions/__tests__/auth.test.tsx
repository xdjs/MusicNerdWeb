jest.mock('@/server/auth', () => ({ getServerAuthSession: jest.fn() }));
jest.mock('@/server/utils/queries/userQueries', () => ({ getUserById: jest.fn() }));
jest.mock('@/server/utils/contributions/getAdminContributions', () => ({ getAdminContributions: jest.fn() }));
jest.mock('../ContributionReview', () => () => null);
jest.mock('next/navigation', () => ({ redirect: jest.fn(() => { throw new Error('redirect'); }), notFound: jest.fn(() => { throw new Error('not found'); }) }));
import Contributions from '../page';
import { getServerAuthSession } from '@/server/auth';
import { getUserById } from '@/server/utils/queries/userQueries';
import { getAdminContributions } from '@/server/utils/contributions/getAdminContributions';
beforeEach(() => jest.clearAllMocks());
it.each([null, {user:{id:'regular'}}])('does not query contributions before a live Admin check', async session => {
 (getServerAuthSession as jest.Mock).mockResolvedValue(session);
 (getUserById as jest.Mock).mockResolvedValue({isAdmin:false});
 await expect(Contributions({searchParams:Promise.resolve({userId:'00000000-0000-4000-8000-000000000001'})})).rejects.toThrow('redirect');
 expect(getAdminContributions).not.toHaveBeenCalled();
});
it('does not turn an invalid user filter into an unfiltered inventory', async () => {
 (getServerAuthSession as jest.Mock).mockResolvedValue({user:{id:'admin'}});
 (getUserById as jest.Mock).mockResolvedValue({isAdmin:true});
 await expect(Contributions({searchParams:Promise.resolve({userId:'invalid'})})).rejects.toThrow('not found');
 expect(getAdminContributions).not.toHaveBeenCalled();
});
