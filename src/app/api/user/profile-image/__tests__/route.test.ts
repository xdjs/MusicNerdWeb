/** @jest-environment node */
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { getUserById, getUserByPrivyId } from '@/server/utils/queries/userQueries';
jest.mock('@/server/utils/queries/userQueries', () => ({getUserById: jest.fn(), getUserByPrivyId: jest.fn()}));
import { GET, POST } from '../route';
import { requireAuth } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/server/lib/supabase';
jest.mock('@/lib/auth-helpers', () => ({ requireAuth: jest.fn() }));
jest.mock('@/server/lib/supabase', () => ({ getSupabaseAdmin: jest.fn() }));
if (typeof Response.json !== 'function') Response.json = (data, init) => new Response(JSON.stringify(data), { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
const storage = { upload: jest.fn(), list: jest.fn(), createSignedUrl: jest.fn() };
beforeEach(() => {
  jest.clearAllMocks();
  (requireAuth as jest.Mock).mockResolvedValue({ authenticated: true, userId: 'owner-one', session: {user: {id: 'owner-one'}} });
  (getSupabaseAdmin as jest.Mock).mockReturnValue({ storage: { from: () => storage } });
  (getUserById as jest.Mock).mockResolvedValue({id: 'owner-one', privyUserId: null});
  storage.upload.mockResolvedValue({ error: null });
});
function request(file: File, origin = 'https://musicnerd.test') {
  return { url: 'https://musicnerd.test/api/user/profile-image', headers: new Headers({ origin }), formData: async () => ({ get: (key: string) => key === 'file' ? file : 'someone-else' }) } as unknown as Request;
}
it('rejects unauthenticated reads and uploads before touching storage', async () => {
  (requireAuth as jest.Mock).mockResolvedValue({ authenticated: false, response: new Response(null, { status: 401 }) });
  expect((await GET()).status).toBe(401);
  expect((await POST({} as Request)).status).toBe(401);
  expect(getSupabaseAdmin).not.toHaveBeenCalled();
});
it('rejects cross-origin uploads', async () => {
  expect((await POST(request(new File(['x'], 'x.png', { type: 'image/png' }), 'https://other.test'))).status).toBe(403);
  expect(storage.upload).not.toHaveBeenCalled();
});
it('rejects invalid image content', async () => {
  expect((await POST(request(new File(['not image'], 'x.png', { type: 'image/png' })))).status).toBe(400);
  expect(storage.upload).not.toHaveBeenCalled();
});
it('normalizes images and only writes the authenticated account path', async () => {
  const png = await sharp({ create: { width: 30, height: 20, channels: 3, background: '#ff75d8' } }).png().toBuffer();
  const response = await POST(request(new File([new Uint8Array(png)], 'image.png', { type: 'image/png' })));
  expect(response.status).toBe(200);
  const [path, output, options] = storage.upload.mock.calls[0];
  expect(path).toBe('owner-one/avatar.webp');
  expect(options.cacheControl).toBe('0');
  expect(await sharp(output).metadata()).toMatchObject({ format: 'webp', width: 512, height: 512 });
});
it('reads the same owner photo via a fresh signed URL', async () => {
  storage.list.mockResolvedValue({ data: [{ name: 'avatar.webp' }] });
  storage.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://storage.test/private?token=test' } });
  const response = await GET();
  expect(storage.list).toHaveBeenCalledWith('owner-one', expect.anything());
  expect(storage.createSignedUrl).toHaveBeenCalledWith('owner-one/avatar.webp', 3600);
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
});

it('resolves a merged Privy account before reading its stable photo', async () => {
  (requireAuth as jest.Mock).mockResolvedValue({authenticated: true, userId: 'deleted-placeholder', session: {user: {privyUserId: 'did:privy:verified'}}});
  (getUserByPrivyId as jest.Mock).mockResolvedValue({id: 'survivor', privyUserId: 'did:privy:verified'});
  storage.list.mockResolvedValue({data: [{name: 'avatar.webp'}]});
  storage.createSignedUrl.mockResolvedValue({data: {signedUrl: 'https://storage.test/private?token=test'}});
  expect((await GET()).status).toBe(200);
  const key = createHash('sha256').update('did:privy:verified').digest('hex');
  expect(storage.createSignedUrl).toHaveBeenCalledWith(`identity-${key}/avatar.webp`, 3600);
  expect(getUserById).not.toHaveBeenCalled();
});
it('rejects a deleted database identity despite a cached session', async () => {
  (getUserById as jest.Mock).mockResolvedValue(null);
  expect((await GET()).status).toBe(401);
  expect(getSupabaseAdmin).not.toHaveBeenCalled();
});
it('does not fall back to a legacy photo on storage failure', async () => {
  (getUserById as jest.Mock).mockResolvedValue({id: 'owner-one', privyUserId: 'did:privy:verified'});
  storage.list.mockResolvedValue({error: new Error('Storage unavailable')});
  expect((await GET()).status).toBe(503);
  expect(storage.list).toHaveBeenCalledTimes(1);
  expect(storage.createSignedUrl).not.toHaveBeenCalled();
});
it('only falls back to the surviving account when no stable photo exists', async () => {
  (getUserById as jest.Mock).mockResolvedValue({id: 'owner-one', privyUserId: 'did:privy:verified'});
  storage.list.mockResolvedValueOnce({data: []}).mockResolvedValueOnce({data: [{name: 'avatar.webp'}]});
  storage.createSignedUrl.mockResolvedValue({data: {signedUrl: 'https://storage.test/private?token=test'}});
  expect((await GET()).status).toBe(200);
  expect(storage.createSignedUrl).toHaveBeenCalledWith('owner-one/avatar.webp', 3600);
});
