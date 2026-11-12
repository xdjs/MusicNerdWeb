import { setSourcePublicationAction } from '../setSourcePublicationAction';
import { getServerAuthSession } from '@/server/auth';
import { setSourcePublication } from '@/server/utils/contributions/setSourcePublication';
import { revalidatePath } from 'next/cache';
jest.mock('@/server/auth', () => ({ getServerAuthSession: jest.fn() }));
jest.mock('@/server/utils/contributions/setSourcePublication', () => ({ setSourcePublication: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
const input = { sourceId: '11111111-1111-4111-8111-111111111111', publication: 'public', expectedUpdatedAt: '2026-01-01T00:00:00Z' };
beforeEach(() => jest.resetAllMocks());
it('refuses unauthenticated requests without mutation', async () => {
  expect(await setSourcePublicationAction(input)).toEqual({ success: false, error: 'Not authenticated.' });
  expect(setSourcePublication).not.toHaveBeenCalled();
});
it('cannot take an administrator identity from input', async () => {
  expect((await setSourcePublicationAction({ ...input, adminId: 'spoofed' })).success).toBe(false);
  expect(setSourcePublication).not.toHaveBeenCalled();
});
it.each(['public', 'private', 'inherit'])('invalidates affected artist after successful %s decision', async publication => {
  const decision = { ...input, publication };
  (getServerAuthSession as jest.Mock).mockResolvedValue({ user: { id: 'actual-admin' } });
  (setSourcePublication as jest.Mock).mockResolvedValue({ artistId: 'artist', ...decision });
  expect((await setSourcePublicationAction(decision)).success).toBe(true);
  expect(setSourcePublication).toHaveBeenCalledWith('actual-admin', decision);
  expect(revalidatePath).toHaveBeenCalledWith('/artist/artist');
  expect(revalidatePath).toHaveBeenCalledTimes(1);
});
it('reports rejection without invalidating or leaking database errors', async () => {
  (getServerAuthSession as jest.Mock).mockResolvedValue({ user: { id: 'user' } });
  (setSourcePublication as jest.Mock).mockRejectedValue(new Error('private DB details'));
  const result = await setSourcePublicationAction(input);
  expect(result.success).toBe(false);
  expect(JSON.stringify(result)).not.toContain('private DB');
  expect(revalidatePath).not.toHaveBeenCalled();
});
