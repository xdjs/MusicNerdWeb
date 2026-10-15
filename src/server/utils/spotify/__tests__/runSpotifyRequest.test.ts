/** @jest-environment node */
import { PgDialect } from 'drizzle-orm/pg-core';
import { db } from '@/server/db/drizzle';
const execute = db.execute as jest.Mock;
jest.mock('@/env', () => ({ SPOTIFY_WEB_CLIENT_ID: 'shared-client' }));
import { runSpotifyRequest } from '../runSpotifyRequest';

const now = Date.parse('2026-10-15T17:00:00Z');
beforeEach(() => { jest.spyOn(Date, 'now').mockReturnValue(now); execute.mockReset(); });
afterEach(() => jest.restoreAllMocks());

it('blocks a new process from requesting during a shared cooldown', async () => {
  execute.mockResolvedValue([{ blocked_until: new Date(now + 60_000).toISOString() }]);
  const request = jest.fn();
  await expect(runSpotifyRequest(request)).rejects.toMatchObject({ retryAtMs: now + 60_000, response: { status: 429 } });
  expect(request).not.toHaveBeenCalled();
});
it('allows requests after expiry without deleting the shared deadline', async () => {
  execute.mockResolvedValue([{ blocked_until: new Date(now - 1).toISOString() }]);
  const request = jest.fn().mockResolvedValue('artist');
  await expect(runSpotifyRequest(request)).resolves.toBe('artist');
  expect(request).toHaveBeenCalledTimes(1);
  expect(execute).toHaveBeenCalledTimes(1);
});
it.each([['90', now + 90_000], ['Thu, 15 Oct 2026 18:00:00 GMT', now + 3_600_000], [undefined, now + 60_000], ['broken', now + 60_000], ['100000', now + 100_000_000]])('persists Retry-After %s without shortening it', async (retryAfter, deadline) => {
  execute.mockResolvedValue([]);
  const request = jest.fn().mockRejectedValue({ response: { status: 429, headers: { 'retry-after': retryAfter } } });
  await expect(runSpotifyRequest(request)).rejects.toMatchObject({ retryAtMs: deadline });
  expect(request).toHaveBeenCalledTimes(1);
  const saved = new PgDialect().sqlToQuery(execute.mock.calls[1][0]);
  expect(saved.sql).toContain('greatest(');
  expect(saved.params).toContain(new Date(deadline).toISOString());
  expect(saved.params[0]).toMatch(/^spotify:[a-f0-9]{64}$/);
  expect(saved.params).not.toContain('shared-client');
});
it('fails closed when the durable cooldown cannot be read', async () => {
  execute.mockRejectedValue(new Error('database unavailable'));
  const request = jest.fn();
  await expect(runSpotifyRequest(request)).rejects.toThrow('database unavailable');
  expect(request).not.toHaveBeenCalled();
});
it('propagates ordinary failures without creating a provider cooldown', async () => {
  execute.mockResolvedValue([]);
  const failure = new Error('network timed out');
  await expect(runSpotifyRequest(jest.fn().mockRejectedValue(failure))).rejects.toBe(failure);
  expect(execute).toHaveBeenCalledTimes(1);
});
