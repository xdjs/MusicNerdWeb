import { test, expect } from '@playwright/test';
import { fetchAsUser, dismissLegacyModal } from './helpers/auth';
import { TEST_ACCOUNTS } from './helpers/test-data';

/* ------------------------------------------------------------------ */
/*  Unauthenticated tests — no login needed, use request context      */
/* ------------------------------------------------------------------ */
test.describe('Unauthenticated requests', () => {
  test('GET /api/user/[id] returns 401', async ({ request }) => {
    const res = await request.get('/api/user/some-id');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Not authenticated' });
  });

  test('GET /api/userEntries returns empty result', async ({ request }) => {
    const res = await request.get('/api/userEntries');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ entries: [], total: 0, pageCount: 0 });
  });

  test('GET /api/recentEdited (no userId param) returns empty array', async ({ request }) => {
    const res = await request.get('/api/recentEdited');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  Authenticated tests — use stored auth state instead of login()    */
/* ------------------------------------------------------------------ */
test.describe('Authenticated requests', () => {
  test.use({ storageState: TEST_ACCOUNTS.regular.storageState });
  test.setTimeout(60_000);

  let userId: string;

  test('fetch own profile via GET /api/user/[id]', async ({ page }) => {
    await page.goto('/');
    await dismissLegacyModal(page);

    // Discover the user's ID from the session
    const session = await fetchAsUser(page, '/api/auth/session');
    expect(session.status).toBe(200);
    expect(session.body?.user?.id).toBeTruthy();
    userId = session.body.user.id;

    // Fetch own profile — should succeed
    const res = await fetchAsUser(page, `/api/user/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body.id).toBe(userId);
  });

  test('authenticated user cannot fetch another user profile', async ({ page }) => {
    await page.goto('/');
    await dismissLegacyModal(page);

    // Use a fake user ID that does not match the logged-in user
    const res = await fetchAsUser(page, '/api/user/wrong-user-id');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Not authorized' });
  });

  test('GET /api/userEntries returns entries structure', async ({ page }) => {
    await page.goto('/');
    await dismissLegacyModal(page);

    const res = await fetchAsUser(page, '/api/userEntries');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('entries');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('pageCount');
    expect(Array.isArray(res.body.entries)).toBe(true);
    expect(typeof res.body.total).toBe('number');
    expect(typeof res.body.pageCount).toBe('number');
  });

  test('GET /api/recentEdited returns array', async ({ page }) => {
    await page.goto('/');
    await dismissLegacyModal(page);

    const res = await fetchAsUser(page, '/api/recentEdited');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  Public userId param test — no auth needed                          */
/* ------------------------------------------------------------------ */
test.describe('Public recentEdited with userId param', () => {
  test('GET /api/recentEdited?userId=<id> returns array', async ({ request }) => {
    // When a userId is provided as query param, the endpoint is public
    const res = await request.get('/api/recentEdited?userId=some-user-id');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});
