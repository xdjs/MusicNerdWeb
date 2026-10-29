import { readAdminResponse } from '../readAdminResponse';

const response = (ok: boolean, json: () => Promise<unknown>) => ({ ok, json }) as unknown as Response;

it('returns the body of a successful response', async () => {
  expect(await readAdminResponse(response(true, async () => ({ status: 'ok' })), 'x')).toEqual({ status: 'ok' });
});
it("throws the response's error", async () => {
  await expect(readAdminResponse(response(false, async () => ({ error: 'Forbidden' })), 'x')).rejects.toThrow('Forbidden');
});
it('throws the fallback when the body has no error', async () => {
  await expect(readAdminResponse(response(false, async () => { throw new Error('not json'); }), 'Could not load.')).rejects.toThrow('Could not load.');
});
