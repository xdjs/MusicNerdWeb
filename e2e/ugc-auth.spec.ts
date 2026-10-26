import { test, expect } from '@playwright/test';
import { login, fetchAsUser } from './helpers/auth';
import { musicNerdApiUrl } from '../src/lib/musicNerdApi/musicNerdApiUrl';

const REGULAR_USER = { email: 'test-4473@privy.io', otp: '676856' };

// ---------------------------------------------------------------------------
// Unauthenticated tests — no login needed, can run in parallel via `request`
// ---------------------------------------------------------------------------
test.describe('Unauthenticated route behavior', () => {
  test('GET /api/ugcCount unauthenticated returns { count: 0 }', async ({ request }) => {
    const res = await request.get('/api/ugcCount');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ count: 0 });
  });

  test('GET MusicNerdAPI /api/pendingUGCCount unauthenticated returns { count: 0 }', async ({ request }) => {
    const res = await request.get(musicNerdApiUrl('/api/pendingUGCCount'));
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ status: 'ok', count: 0 });
  });

  test('GET /api/approvedUGCCount unauthenticated returns { count: 0 }', async ({ request }) => {
    const res = await request.get('/api/approvedUGCCount');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ count: 0 });
  });

  for (const route of ['removeArtistData', 'directEditLink']) {
    test(`POST MusicNerdAPI /api/${route} unauthenticated returns 401`, async ({ request }) => {
      const res = await request.post(musicNerdApiUrl(`/api/${route}`), {
        data: {},
        maxRedirects: 0,
      });
      expect(res.status()).toBe(401);
      expect(await res.json()).toEqual({ status: 'error', error: 'Not signed in' });
    });
  }
});

// ---------------------------------------------------------------------------
// Authenticated tests — regular user
// Single login, multiple API checks to avoid Privy rate-limiting
// ---------------------------------------------------------------------------
test.describe('Regular user route behavior', () => {
  test.setTimeout(60_000);

  test('all UGC routes return expected results for regular user', async ({ page }) => {
    await login(page, REGULAR_USER.email, REGULAR_USER.otp);

    // GET /api/ugcCount — authenticated user gets a numeric count
    const ugcRes = await fetchAsUser(page, '/api/ugcCount');
    expect(ugcRes.status).toBe(200);
    expect(ugcRes.body).toHaveProperty('count');
    expect(typeof ugcRes.body.count).toBe('number');

    // GET /api/pendingUGCCount — retired on Web; MusicNerdAPI serves it with a Privy bearer token
    const pendingRes = await fetchAsUser(page, '/api/pendingUGCCount');
    expect(pendingRes.status).toBe(404);

    // GET /api/approvedUGCCount — authenticated user gets a numeric count
    const approvedRes = await fetchAsUser(page, '/api/approvedUGCCount');
    expect(approvedRes.status).toBe(200);
    expect(approvedRes.body).toHaveProperty('count');
    expect(typeof approvedRes.body.count).toBe('number');

    // The Web route is retired. A 404 must not count as successful API auth:
    // MusicNerdAPI requires a Privy bearer token, not this Web session cookie.
    const removeRes = await fetchAsUser(page, '/api/removeArtistData', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(removeRes.status).toBe(404);
  });
});
