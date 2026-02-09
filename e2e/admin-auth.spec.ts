import { test, expect } from '@playwright/test';
import { login, fetchAsUser } from './helpers/auth';

const ADMIN_EMAIL = 'test-3256@privy.io';
const ADMIN_OTP = '207862';
const USER_EMAIL = 'test-4473@privy.io';
const USER_OTP = '676856';

test.describe('Admin auth routes', () => {
  test('admin can update user whitelist status', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_OTP);
    // Actual test would need a real user ID to update
    // This is a smoke test to verify auth flow works
    const res = await fetchAsUser(page, '/api/admin/whitelist-user/nonexistent-id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isWhiteListed: true }),
    });
    // Should get 400 (user not found / no fields) rather than 401/403
    expect([200, 400]).toContain(res.status);
  });

  test('regular user gets 403 on admin operations', async ({ page }) => {
    await login(page, USER_EMAIL, USER_OTP);
    const res = await fetchAsUser(page, '/api/admin/whitelist-user/some-id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isWhiteListed: true }),
    });
    expect(res.status).toBe(403);
  });

  test('unauthenticated request gets 401', async ({ page }) => {
    const res = await page.request.put('/api/admin/whitelist-user/some-id', {
      data: { isWhiteListed: true },
    });
    expect(res.status()).toBe(401);
  });
});
