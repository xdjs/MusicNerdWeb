import { test, expect } from '@playwright/test';
import { login, dismissLegacyModal } from './helpers/auth';
import { TEST_ACCOUNTS } from './helpers/test-data';

// These tests exercise the login/logout flow directly — no stored auth state.
test.describe('Auth flow', () => {
  test.setTimeout(90_000);

  test('unauthenticated state shows login button', async ({ page }) => {
    await page.goto('/');

    // Login button visible
    await expect(page.locator('#login-btn')).toBeVisible();

    // Open the dropdown — should NOT see "Log Out" or "Admin Panel"
    await page.click('#login-btn');
    await expect(page.getByRole('menuitem', { name: 'Log In' })).toBeVisible();
    await expect(page.getByText('Log Out')).not.toBeVisible();
    await expect(page.getByText('Admin Panel')).not.toBeVisible();
  });

  test('regular user login shows profile menu without admin link', async ({ page }) => {
    await login(page, TEST_ACCOUNTS.regular.email, TEST_ACCOUNTS.regular.otp);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissLegacyModal(page);

    // Profile button should be visible (authenticated state shows avatar)
    const profileBtn = page.locator('#login-btn');
    await expect(profileBtn).toBeVisible();
    await profileBtn.click();

    // Should see User Profile and Leaderboard links
    await expect(page.getByText('User Profile')).toBeVisible();
    await expect(page.getByText('Leaderboard')).toBeVisible();

    // Should NOT see Admin Panel
    await expect(page.getByText('Admin Panel')).not.toBeVisible();

    // Should see Log Out
    await expect(page.getByText('Log Out')).toBeVisible();
  });

  test('admin user login shows admin panel link', async ({ page }) => {
    await login(page, TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.otp);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissLegacyModal(page);

    const profileBtn = page.locator('#login-btn');
    await expect(profileBtn).toBeVisible();
    await profileBtn.click();

    // Admin should see the Admin Panel link
    await expect(page.getByText('Admin Panel')).toBeVisible();
  });

  test('logout clears session', async ({ page }) => {
    await login(page, TEST_ACCOUNTS.regular.email, TEST_ACCOUNTS.regular.otp);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissLegacyModal(page);

    // Open dropdown and click Log Out
    await page.click('#login-btn');
    await page.getByText('Log Out').click();

    // Wait for page reload / session clear
    await page.waitForLoadState('networkidle');

    // Should be back to unauthenticated state — Log In menu item visible
    await page.click('#login-btn');
    await expect(page.getByRole('menuitem', { name: 'Log In' })).toBeVisible({ timeout: 15_000 });
  });
});
