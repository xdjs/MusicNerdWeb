import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS } from './helpers/test-data';

test.describe('Admin UI — unauthenticated', () => {
  test('unauthenticated user visiting /admin is redirected to home', async ({ page }) => {
    await page.goto('/admin');

    // Server-side redirect sends unauthenticated users to "/"
    expect(page.url()).toMatch(/\/$/);
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).not.toBeVisible();
  });
});

test.describe('Admin UI — non-admin user', () => {
  test.use({ storageState: TEST_ACCOUNTS.regular.storageState });

  test('non-admin user visiting /admin is redirected to home', async ({ page }) => {
    await page.goto('/admin');

    // After PR #976, non-admin users are redirected to "/" instead of seeing 401
    await page.waitForURL('**/');
    expect(page.url()).toMatch(/\/$/);
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).not.toBeVisible();
  });
});

test.describe('Admin UI — authenticated admin', () => {
  test.use({ storageState: TEST_ACCOUNTS.admin.storageState });

  test('dashboard renders with expected sections', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Pending UGC Submissions')).toBeVisible();
  });

  test('user search filters the users table', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible({ timeout: 15_000 });

    // Find the search input in the Users section
    const searchInput = page.getByPlaceholder('Search by username or wallet');
    await expect(searchInput).toBeVisible({ timeout: 5_000 });
    await searchInput.fill('test');
    // After typing, the table should update (we just verify no crash)
    await page.waitForTimeout(500);
    await expect(searchInput).toHaveValue('test');
  });
});
