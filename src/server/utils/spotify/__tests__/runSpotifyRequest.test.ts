/** @jest-environment node */
import { PgDialect } from 'drizzle-orm/pg-core';
let execute: jest.Mock;
let runSpotifyRequest: typeof import('../runSpotifyRequest').runSpotifyRequest;
jest.mock('@/env', () => ({ SPOTIFY_WEB_CLIENT_ID: 'shared-client' }));
jest.mock('../spotifyCooldownKey', () => ({
  spotifyCooldownKey: jest.fn(jest.requireActual('../spotifyCooldownKey').spotifyCooldownKey),
}));

const now = Date.parse('2026-10-15T17:00:00Z');
beforeEach(() => {
  jest.resetModules();
  execute = require('@/server/db/drizzle').db.execute;
  runSpotifyRequest = require('../runSpotifyRequest').runSpotifyRequest;
  jest.spyOn(Date, 'now').mockReturnValue(now);
  execute.mockReset();
});
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

it('reuses only an observed active deadline instead of reading on every blocked call', async () => {
  execute.mockResolvedValue([{ blocked_until: new Date(now + 60_000).toISOString() }]);
  const request = jest.fn();
  for (let i = 0; i < 100; i++) {
    await expect(runSpotifyRequest(request)).rejects.toMatchObject({ retryAtMs: now + 60_000 });
  }
  expect(execute).toHaveBeenCalledTimes(1);
  expect(request).not.toHaveBeenCalled();
});
it('shares an in-flight deadline read across concurrent blocked callers', async () => {
  let resolve!: (rows: unknown[]) => void;
  execute.mockReturnValue(new Promise(res => { resolve = res; }));
  const request = jest.fn();
  const results = Promise.allSettled(Array.from({ length: 20 }, () => runSpotifyRequest(request)));
  resolve([{ blocked_until: new Date(now + 60_000).toISOString() }]);
  expect((await results).every(result => result.status === 'rejected')).toBe(true);
  expect(execute).toHaveBeenCalledTimes(1);
  expect(request).not.toHaveBeenCalled();
});
it('rechecks the durable deadline at expiry and observes another process extending it', async () => {
  execute.mockResolvedValueOnce([{ blocked_until: new Date(now + 60_000).toISOString() }])
    .mockResolvedValueOnce([{ blocked_until: new Date(now + 120_000).toISOString() }])
    .mockResolvedValue([]);
  const request = jest.fn().mockResolvedValue('recovered');
  await expect(runSpotifyRequest(request)).rejects.toMatchObject({ retryAtMs: now + 60_000 });
  jest.mocked(Date.now).mockReturnValue(now + 60_000);
  await expect(runSpotifyRequest(request)).rejects.toMatchObject({ retryAtMs: now + 120_000 });
  jest.mocked(Date.now).mockReturnValue(now + 120_000);
  await expect(runSpotifyRequest(request)).resolves.toBe('recovered');
  expect(execute).toHaveBeenCalledTimes(3);
  expect(request).toHaveBeenCalledTimes(1);
});
it('never caches an allowed result that could hide a new shared cooldown', async () => {
  execute.mockResolvedValueOnce([]).mockResolvedValue([{ blocked_until: new Date(now + 60_000).toISOString() }]);
  const request = jest.fn().mockResolvedValue('ok');
  await expect(runSpotifyRequest(request)).resolves.toBe('ok');
  await expect(runSpotifyRequest(request)).rejects.toMatchObject({ retryAtMs: now + 60_000 });
  expect(execute).toHaveBeenCalledTimes(2);
  expect(request).toHaveBeenCalledTimes(1);
});
it('isolates observed deadlines by credential key', async () => {
  execute.mockResolvedValueOnce([{ blocked_until: new Date(now + 60_000).toISOString() }]).mockResolvedValue([]);
  const request = jest.fn().mockResolvedValue('ok');
  await expect(runSpotifyRequest(request)).rejects.toMatchObject({ retryAtMs: now + 60_000 });
  jest.mocked(require('../spotifyCooldownKey').spotifyCooldownKey).mockReturnValue('other-credential');
  await expect(runSpotifyRequest(request)).resolves.toBe('ok');
  expect(execute).toHaveBeenCalledTimes(2);
});
it('does not retain a failed read and continues to fail closed until recovery', async () => {
  execute.mockRejectedValueOnce(new Error('database unavailable')).mockResolvedValue([]);
  const request = jest.fn().mockResolvedValue('ok');
  await expect(runSpotifyRequest(request)).rejects.toThrow('database unavailable');
  expect(request).not.toHaveBeenCalled();
  await expect(runSpotifyRequest(request)).resolves.toBe('ok');
});
it('remembers a real 429 even when persisting it fails, without hiding the persistence error', async () => {
  execute.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('write failed'));
  const limited = jest.fn().mockRejectedValue({ response: { status: 429, headers: { 'retry-after': '90' } } });
  await expect(runSpotifyRequest(limited)).rejects.toThrow('write failed');
  const next = jest.fn();
  await expect(runSpotifyRequest(next)).rejects.toMatchObject({ retryAtMs: now + 90_000 });
  expect(next).not.toHaveBeenCalled();
  expect(execute).toHaveBeenCalledTimes(2);
});
