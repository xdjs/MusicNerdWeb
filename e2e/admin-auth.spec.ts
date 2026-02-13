import { test, expect } from '@playwright/test';
import { login, fetchAsUser } from './helpers/auth';

test.describe('Admin route auth checks', () => {
  test.setTimeout(60_000);

  test('Unauthenticated request gets 401', async ({ request }) => {
    // PUT to admin whitelist-user endpoint without any auth
    const whitelistRes = await request.put('/api/admin/whitelist-user/test-id', {
      data: { isWhiteListed: true },
    });
    expect(whitelistRes.status()).toBe(401);

    // PUT to artistBio endpoint without any auth
    const bioRes = await request.put('/api/artistBio/test-id', {
      data: { bio: 'Unauthenticated bio attempt' },
    });
    expect(bioRes.status()).toBe(401);
  });

  test('Regular user gets 403 on admin operations', async ({ page }) => {
    await login(page, 'test-4473@privy.io', '676856');

    const result = await fetchAsUser(page, '/api/admin/whitelist-user/test-id', {
      method: 'PUT',
      body: JSON.stringify({ isWhiteListed: true }),
    });

    expect(result.status).toBe(403);
  });

  test('Admin can update artist bio', async ({ page }) => {
    await login(page, 'test-3256@privy.io', '207862');

    const result = await fetchAsUser(page, '/api/artistBio/some-artist-id', {
      method: 'PUT',
      body: JSON.stringify({ bio: 'E2E test bio' }),
    });

    // Should NOT be 401 (unauthenticated)
    expect(result.status).not.toBe(401);

    // Auth 403 returns { error: 'Forbidden' }, business logic 403 returns { message: '...' }
    // If we get 403, it must be from business logic (artist not found), not from auth
    if (result.status === 403) {
      expect(result.body).not.toHaveProperty('error', 'Forbidden');
      expect(result.body).toHaveProperty('message');
    }
  });

  test('Admin can access whitelist-user endpoint', async ({ page }) => {
    await login(page, 'test-3256@privy.io', '207862');

    const result = await fetchAsUser(page, '/api/admin/whitelist-user/test-id', {
      method: 'PUT',
      body: JSON.stringify({ isWhiteListed: true }),
    });

    // Should NOT be 401 or 403 -- auth and authorization passed
    // 200 if user exists, 400/404 if not -- either is acceptable
    expect(result.status).not.toBe(401);
    expect(result.status).not.toBe(403);
  });
});

test.describe('Admin page access checks', () => {
  test.setTimeout(60_000);

  test('Unauthenticated user visiting /admin is redirected to home', async ({ page }) => {
    const response = await page.goto('/admin');

    // Server-side redirect sends unauthenticated users to "/"
    // After redirect, the URL should be the home page
    expect(page.url()).toMatch(/\/$/);
    // Should NOT see "Admin Dashboard"
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).not.toBeVisible();
  });

  test('Regular user visiting /admin is redirected to home', async ({ page }) => {
    await login(page, 'test-4473@privy.io', '676856');

    await page.goto('/admin');

    // Non-admin user is redirected to "/" (changed from UnauthorizedPage in PR #976)
    await page.waitForURL('**/');
    expect(page.url()).toMatch(/\/$/);
    // Should NOT see the admin dashboard
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).not.toBeVisible();
  });

  test('Admin user visiting /admin sees Admin Dashboard', async ({ page }) => {
    await login(page, 'test-3256@privy.io', '207862');

    await page.goto('/admin');

    // Admin user should see the dashboard heading
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible({ timeout: 15_000 });
    // Should see admin-specific content like the Pending UGC section
    await expect(page.getByText('Pending UGC Submissions')).toBeVisible();
  });
});
