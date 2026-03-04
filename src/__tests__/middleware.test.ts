import { NextRequest } from 'next/server';

// Helper to build a fake NextRequest
function makeRequest(path: string, ip = '1.2.3.4'): NextRequest {
  const url = `https://localhost:3000${path}`;
  const req = new NextRequest(url, {
    headers: { 'x-forwarded-for': ip },
  });
  return req;
}

// We re-import middleware per test group so the in-memory Map resets
async function loadMiddleware() {
  jest.resetModules();
  const mod = await import('../middleware');
  return mod;
}

beforeEach(() => {
  jest.useFakeTimers();
  // Clear env overrides
  delete process.env.RATE_LIMIT_DEFAULT;
  delete process.env.RATE_LIMIT_STRICT;
  delete process.env.RATE_LIMIT_MEDIUM;
  delete process.env.RATE_LIMIT_WINDOW_MS;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('middleware rate limiting', () => {
  it('passes through requests under the default limit', async () => {
    const { middleware } = await loadMiddleware();
    for (let i = 0; i < 60; i++) {
      const res = middleware(makeRequest('/api/leaderboard'));
      expect(res.status).not.toBe(429);
    }
  });

  it('returns 429 when default limit is exceeded', async () => {
    const { middleware } = await loadMiddleware();
    for (let i = 0; i < 60; i++) {
      middleware(makeRequest('/api/leaderboard'));
    }
    const res = middleware(makeRequest('/api/leaderboard'));
    expect(res.status).toBe(429);
  });

  it('strict paths have lower limits (5/min)', async () => {
    const { middleware } = await loadMiddleware();
    for (let i = 0; i < 5; i++) {
      const res = middleware(makeRequest('/api/funFacts/random'));
      expect(res.status).not.toBe(429);
    }
    const res = middleware(makeRequest('/api/funFacts/random'));
    expect(res.status).toBe(429);
  });

  it('strict limit applies to artistBio path', async () => {
    const { middleware } = await loadMiddleware();
    for (let i = 0; i < 5; i++) {
      middleware(makeRequest('/api/artistBio/123'));
    }
    const res = middleware(makeRequest('/api/artistBio/123'));
    expect(res.status).toBe(429);
  });

  it('medium paths have their own limit (20/min)', async () => {
    const { middleware } = await loadMiddleware();
    for (let i = 0; i < 20; i++) {
      const res = middleware(makeRequest('/api/validateLink'));
      expect(res.status).not.toBe(429);
    }
    const res = middleware(makeRequest('/api/validateLink'));
    expect(res.status).toBe(429);
  });

  it('window resets after expiry', async () => {
    const { middleware } = await loadMiddleware();
    // Exhaust limit
    for (let i = 0; i < 60; i++) {
      middleware(makeRequest('/api/leaderboard'));
    }
    expect(middleware(makeRequest('/api/leaderboard')).status).toBe(429);

    // Advance past the 60s window
    jest.advanceTimersByTime(61_000);

    const res = middleware(makeRequest('/api/leaderboard'));
    expect(res.status).not.toBe(429);
  });

  it('env vars override defaults', async () => {
    process.env.RATE_LIMIT_STRICT = '10';
    const { middleware } = await loadMiddleware();

    for (let i = 0; i < 10; i++) {
      const res = middleware(makeRequest('/api/funFacts/random'));
      expect(res.status).not.toBe(429);
    }
    const res = middleware(makeRequest('/api/funFacts/random'));
    expect(res.status).toBe(429);
  });

  it('429 response includes Retry-After header', async () => {
    const { middleware } = await loadMiddleware();
    for (let i = 0; i < 60; i++) {
      middleware(makeRequest('/api/leaderboard'));
    }
    const res = middleware(makeRequest('/api/leaderboard'));
    expect(res.status).toBe(429);
    const retryAfter = res.headers.get('Retry-After');
    expect(retryAfter).toBeTruthy();
    expect(Number(retryAfter)).toBeGreaterThan(0);
    expect(Number(retryAfter)).toBeLessThanOrEqual(60);
  });

  it('different IPs are tracked independently', async () => {
    const { middleware } = await loadMiddleware();
    // Exhaust limit for IP A
    for (let i = 0; i < 60; i++) {
      middleware(makeRequest('/api/leaderboard', '10.0.0.1'));
    }
    expect(middleware(makeRequest('/api/leaderboard', '10.0.0.1')).status).toBe(429);

    // IP B should still be fine
    const res = middleware(makeRequest('/api/leaderboard', '10.0.0.2'));
    expect(res.status).not.toBe(429);
  });

  it('expired entries are cleaned up from the map', async () => {
    const { middleware, _rateLimitMap } = await loadMiddleware();

    // Create entries for multiple IPs
    for (let i = 0; i < 5; i++) {
      middleware(makeRequest('/api/leaderboard', `10.0.0.${i}`));
    }
    expect(_rateLimitMap.size).toBe(5);

    // Advance past window
    jest.advanceTimersByTime(61_000);

    // Trigger cleanup by making enough requests (cleanup runs every 100 requests)
    for (let i = 0; i < 100; i++) {
      middleware(makeRequest('/api/leaderboard', '99.99.99.99'));
    }

    // Old entries should be cleaned up; only the new IP:tier key should remain
    expect(_rateLimitMap.has('10.0.0.0:default')).toBe(false);
    expect(_rateLimitMap.has('99.99.99.99:default')).toBe(true);
  });
});
