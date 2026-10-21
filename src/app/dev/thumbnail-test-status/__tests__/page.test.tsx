import Page from '../page';
import { getServerAuthSession } from '@/server/auth';
import { canEditArtist } from '@/server/utils/artistEditAuth';
jest.mock('next/navigation', () => ({ notFound: () => { throw new Error('not found'); } }));
jest.mock('@/server/auth', () => ({ getServerAuthSession: jest.fn() }));
jest.mock('@/server/utils/artistEditAuth', () => ({ canEditArtist: jest.fn() }));
jest.mock('../ThumbnailTestStatus', () => ({ __esModule:true, default: () => null }));
const saved = {...process.env};
beforeEach(() => {
  jest.clearAllMocks();
  process.env.VERCEL_ENV='preview';
  process.env.VERCEL_GIT_COMMIT_REF='codex/1583-suggestion-routing';
  process.env.MN_THUMBNAIL_TEST_SCOPE=JSON.stringify({artistId:'artist',url:'https://example.com/',expiresAt:Date.now()+60000});
});
afterEach(() => { process.env={...saved}; });
test('rejects production before authentication', async () => {
  process.env.VERCEL_ENV='production';
  await expect(Page()).rejects.toThrow('not found');
  expect(getServerAuthSession).not.toHaveBeenCalled();
});
test('rejects a missing session without a development fallback', async () => {
  jest.mocked(getServerAuthSession).mockResolvedValue(null);
  await expect(Page()).rejects.toThrow('not found');
  expect(canEditArtist).not.toHaveBeenCalled();
});
test('rejects an unauthorized session', async () => {
  jest.mocked(getServerAuthSession).mockResolvedValue({user:{id:'user'}} as never);
  jest.mocked(canEditArtist).mockResolvedValue(false);
  await expect(Page()).rejects.toThrow('not found');
});
test('binds only the configured artist after existing authorization', async () => {
  jest.mocked(getServerAuthSession).mockResolvedValue({user:{id:'user'}} as never);
  jest.mocked(canEditArtist).mockResolvedValue(true);
  expect((await Page()).props).toEqual({artistId:'artist'});
  expect(canEditArtist).toHaveBeenCalledWith('user','artist');
});
test('rejects expired configuration', async () => {
  process.env.MN_THUMBNAIL_TEST_SCOPE=JSON.stringify({artistId:'artist',url:'https://example.com/',expiresAt:Date.now()-1});
  await expect(Page()).rejects.toThrow('not found');
});
