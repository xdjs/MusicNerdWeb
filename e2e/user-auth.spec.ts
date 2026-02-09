import { test, expect } from '@playwright/test';
import { login, fetchAsUser } from './helpers/auth';

const USER_EMAIL = 'test-4473@privy.io';
const USER_OTP = '676856';

test.describe('User auth routes', () => {
  test('authenticated user can fetch their entries', async ({ page }) => {
    await login(page, USER_EMAIL, USER_OTP);
    const res = await fetchAsUser(page, '/api/userEntries');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('entries');
  });

  test('authenticated user can fetch recent edits', async ({ page }) => {
    await login(page, USER_EMAIL, USER_OTP);
    const res = await fetchAsUser(page, '/api/recentEdited');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('unauthenticated request gets empty data on userEntries', async ({ page }) => {
    const res = await page.request.get('/api/userEntries');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.entries).toEqual([]);
  });

  test('unauthenticated request gets 401 on user profile', async ({ page }) => {
    const res = await page.request.get('/api/user/some-id');
    expect(res.status()).toBe(401);
  });
});
