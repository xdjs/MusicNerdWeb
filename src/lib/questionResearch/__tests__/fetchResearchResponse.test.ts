import { fetchResearchResponse } from '../fetchResearchResponse';
const reply = (status: number, retryAfter?: string) => ({ status, headers: new Headers(retryAfter ? { 'Retry-After': retryAfter } : {}) }) as Response;
beforeEach(() => jest.useFakeTimers());
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
it('honors the cooldown and retries the exact saved-job request once', async () => {
 const throttled = reply(429, '18'), ready = reply(200);
 global.fetch = jest.fn().mockResolvedValueOnce(throttled).mockResolvedValueOnce(ready);
 const onCooldown = jest.fn(), signal = new AbortController().signal;
 const init = { method: 'POST', body: JSON.stringify({ question: 'Who created it?' }), signal };
 const result = fetchResearchResponse('/api/artist/artist/questionResearch/saved/answer', init, onCooldown);
 await jest.advanceTimersByTimeAsync(0);expect(onCooldown).toHaveBeenCalledWith(18);
 await jest.advanceTimersByTimeAsync(17999);expect(fetch).toHaveBeenCalledTimes(1);
 await jest.advanceTimersByTimeAsync(1);expect(await result).toBe(ready);
 expect(jest.mocked(fetch).mock.calls).toEqual([['/api/artist/artist/questionResearch/saved/answer', init], ['/api/artist/artist/questionResearch/saved/answer', init]]);
});
it('stops waiting without issuing another request after abort', async () => {
 global.fetch = jest.fn().mockResolvedValue(reply(429, '10'));
 const controller = new AbortController();
 const result = fetchResearchResponse('/saved', { signal: controller.signal });
 const assertion = expect(result).rejects.toThrow();
 await jest.advanceTimersByTimeAsync(0);controller.abort();await assertion;
 await jest.advanceTimersByTimeAsync(20000);expect(fetch).toHaveBeenCalledTimes(1);
});
it.each([undefined, 'invalid', '0', '-1', '121', 'Infinity'])('does not automatically retry an absent or unusable Retry-After=%s', async retry => {
 const response = reply(429, retry);global.fetch = jest.fn().mockResolvedValue(response);
 expect(await fetchResearchResponse('/start', { signal: new AbortController().signal })).toBe(response);
 expect(fetch).toHaveBeenCalledTimes(1);
});
it('bounds repeated throttling instead of retrying indefinitely', async () => {
 const response = reply(429, '1');global.fetch = jest.fn().mockResolvedValue(response);
 const result = fetchResearchResponse('/saved', { signal: new AbortController().signal });
 await jest.advanceTimersByTimeAsync(3000);expect(await result).toBe(response);expect(fetch).toHaveBeenCalledTimes(4);
});
it('accepts an HTTP-date Retry-After without retrying early', async () => {
 jest.setSystemTime(new Date('2026-10-14T19:01:00Z'));const response = reply(200);
 global.fetch = jest.fn().mockResolvedValueOnce(reply(429, 'Wed, 14 Oct 2026 19:01:05 GMT')).mockResolvedValueOnce(response);
 const result=fetchResearchResponse('/saved',{signal:new AbortController().signal});
 await jest.advanceTimersByTimeAsync(4999);expect(fetch).toHaveBeenCalledTimes(1);
 await jest.advanceTimersByTimeAsync(1);expect(await result).toBe(response);
});
it('never automatically retries an explicit quota even with a short Retry-After', async () => {
 const response = reply(429, '1');
 response.headers.set('X-MusicNerd-Quota', 'true');
 global.fetch = jest.fn().mockResolvedValue(response);
 const onCooldown = jest.fn();
 const result = fetchResearchResponse('/start', { signal: new AbortController().signal }, onCooldown);
 await jest.advanceTimersByTimeAsync(10000);
 expect(await result).toBe(response);
 expect(fetch).toHaveBeenCalledTimes(1);
 expect(onCooldown).not.toHaveBeenCalled();
});
it('recognizes a quota body if an intermediary drops its explicit header', async () => {
 const response = { ...reply(429, '1'), clone: () => ({ json: async () => ({ code: 'saved_evidence_quota' }) }) } as Response;
 global.fetch = jest.fn().mockResolvedValue(response);
 const result = fetchResearchResponse('/start', { signal: new AbortController().signal });
 await jest.advanceTimersByTimeAsync(10000);
 expect(await result).toBe(response);
 expect(fetch).toHaveBeenCalledTimes(1);
});
