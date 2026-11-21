import { readOAuthResponse } from '../readOAuthResponse';

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

it('returns the body of a successful response', async () => {
  await expect(readOAuthResponse(reply(200, { status: 'ok', agent: 'Claude' }))).resolves.toEqual({ status: 'ok', agent: 'Claude' });
});
it('throws the API error message on a failure', async () => {
  await expect(readOAuthResponse(reply(400, { status: 'error', error: 'Invalid authorization request' }))).rejects.toThrow('Invalid authorization request');
});
it('throws a generic message when a failure has no JSON error', async () => {
  await expect(readOAuthResponse(new Response('Bad gateway', { status: 502 }))).rejects.toThrow('Something went wrong. Please try again.');
});
