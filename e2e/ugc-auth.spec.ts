import { test, expect } from '@playwright/test';
import { login, fetchAsUser } from './helpers/auth';

const ADMIN_EMAIL = 'test-3256@privy.io';
const ADMIN_OTP = '207862';
const USER_EMAIL = 'test-4473@privy.io';
const USER_OTP = '676856';

test.describe('UGC auth routes', () => {
  test('authenticated user sees their UGC count', async ({ page }) => {
    await login(page, USER_EMAIL, USER_OTP);
    const res = await fetchAsUser(page, '/api/ugcCount');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.count).toBe('number');
  });

  test('admin sees pending UGC count', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_OTP);
    const res = await fetchAsUser(page, '/api/pendingUGCCount');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.count).toBe('number');
  });

  test('regular user gets count 0 for pending UGC count', async ({ page }) => {
    await login(page, USER_EMAIL, USER_OTP);
    const res = await fetchAsUser(page, '/api/pendingUGCCount');
    const data = await res.json();
    expect(data.count).toBe(0);
  });

  test('unauthenticated request gets 401 on removeArtistData', async ({ page }) => {
    const res = await page.request.post('/api/removeArtistData', {
      data: { artistId: 'a1', siteName: 'spotify' },
    });
    expect(res.status()).toBe(401);
  });
});
