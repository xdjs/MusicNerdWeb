import { requestAdminApi } from '@/lib/admin/requestAdminApi';
import { reviewClaim } from '../reviewClaim';

jest.mock('@/lib/admin/requestAdminApi', () => ({ requestAdminApi: jest.fn() }));
const request = requestAdminApi as jest.Mock;
const respond = (status: number, body: unknown) => request.mockResolvedValueOnce({ ok: status < 400, status, json: async () => body });
beforeEach(() => jest.clearAllMocks());

it.each(['approve', 'reject', 'revoke'] as const)('posts %s to the claim endpoint', async action => {
  respond(200, { status: 'ok' });
  expect(await reviewClaim('c1', action)).toEqual({ success: true });
  expect(request).toHaveBeenCalledWith(`/api/admin/claims/c1/${action}`, { method: 'POST' });
});
it('returns an approval warning', async () => {
  respond(200, { status: 'ok', warning: 'Claim approved, but …' });
  expect(await reviewClaim('c1', 'approve')).toEqual({ success: true, warning: 'Claim approved, but …' });
});
it('returns the API error', async () => {
  respond(409, { status: 'error', error: 'Can only revoke approved claims' });
  expect(await reviewClaim('c1', 'revoke')).toEqual({ success: false, error: 'Can only revoke approved claims' });
});
