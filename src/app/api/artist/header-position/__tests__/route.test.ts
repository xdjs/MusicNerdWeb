/** @jest-environment node */
import { db } from '@/server/db/drizzle';
import { PATCH } from '../route';
import { getServerAuthSession } from '@/server/auth';
import { getDevSession } from '@/server/utils/dev-auth';
import { canEditArtist } from '@/server/utils/artistEditAuth';

const mockReturning = jest.fn();
const mockSet = jest.fn(() => ({ where: jest.fn(() => ({ returning: mockReturning })) }));
jest.mock('@/server/db/drizzle', () => ({ db: { update: jest.fn(() => ({ set: mockSet })) } }));
jest.mock('@/server/auth', () => ({ getServerAuthSession: jest.fn() }));
jest.mock('@/server/utils/dev-auth', () => ({ getDevSession: jest.fn() }));
jest.mock('@/server/utils/artistEditAuth', () => ({ canEditArtist: jest.fn() }));
if (!Response.json) {
  Response.json = (data: unknown, init?: ResponseInit) => new Response(JSON.stringify(data), { ...init, headers: { 'Content-Type': 'application/json' } });
}
const body = { artistId: '2df8ccbf-6556-41d0-b468-b9cff9d7a16a', imageUrl: 'https://example.com/photo.jpg', y: 35 };
const request = (value: unknown = body) => new Request('http://localhost/api/artist/header-position', { method: 'PATCH', body: JSON.stringify(value) });
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(db.update).mockReturnValue({ set: mockSet } as never);
  jest.mocked(getServerAuthSession).mockResolvedValue({ user: { id: 'user-1' } } as never);
  jest.mocked(getDevSession).mockResolvedValue(null);
  jest.mocked(canEditArtist).mockResolvedValue(true);
  mockReturning.mockResolvedValue([{ id: body.artistId }]);
});
it('requires authentication', async () => {
  jest.mocked(getServerAuthSession).mockResolvedValue(null);
  expect((await PATCH(request())).status).toBe(401);
  expect(mockSet).not.toHaveBeenCalled();
});
it('rejects someone without permission for this artist', async () => {
  jest.mocked(canEditArtist).mockResolvedValue(false);
  expect((await PATCH(request())).status).toBe(403);
  expect(mockSet).not.toHaveBeenCalled();
});
it.each([-1, 101, 1.5, '50', null])('rejects invalid position %s', async y => {
  expect((await PATCH(request({ ...body, y }))).status).toBe(400);
  expect(mockSet).not.toHaveBeenCalled();
});
it.each(['javascript:alert(1)', '//example.com/x', '', 'http://example.com/x'])('rejects invalid image URL %s', async imageUrl => {
  expect((await PATCH(request({ ...body, imageUrl }))).status).toBe(400);
});
it('rejects malformed JSON', async () => {
  expect((await PATCH(new Request('http://localhost', { method: 'PATCH', body: '{' }))).status).toBe(400);
});
it('updates only framing with the existing edit permission', async () => {
  expect((await PATCH(request())).status).toBe(200);
  expect(canEditArtist).toHaveBeenCalledWith('user-1', body.artistId);
  expect(mockSet).toHaveBeenCalledWith({ headerImagePosition: { imageUrl: body.imageUrl, y: 35 } });
});
it('returns 404 if the artist disappeared', async () => {
  mockReturning.mockResolvedValue([]);
  expect((await PATCH(request())).status).toBe(404);
});
it('returns a safe error if persistence fails', async () => {
  mockReturning.mockRejectedValue(new Error('db unavailable'));
  expect((await PATCH(request())).status).toBe(500);
});
