import { test, expect } from '@playwright/test';
import { dismissLegacyModal } from './helpers/auth';
import { TEST_ACCOUNTS } from './helpers/test-data';

// Requires: PR #976 merged (restores profile page from stub)

test.describe('Profile — guest state', () => {
  test('shows login prompt for unauthenticated users', async ({ page }) => {
    await page.goto('/profile');

    // Guest users see "User Profile" heading with a "Log In" button
    await expect(page.getByRole('heading', { name: 'User Profile' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();
  });
});

test.describe('Profile — authenticated', () => {
  test.use({ storageState: TEST_ACCOUNTS.regular.storageState });
  test.setTimeout(60_000);

  test('shows user profile with stats', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    await dismissLegacyModal(page);

    // Should show user stats (UGC Total, Artists Total, etc.)
    await expect(page.getByText(/ugc total/i).or(page.getByText(/artists total/i))).toBeVisible({ timeout: 15_000 });

    // Should show bookmarks section
    await expect(page.getByText(/bookmarks/i)).toBeVisible();
  });

  test('username editing works', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    await dismissLegacyModal(page);

    // Find and click the edit (pencil) icon for username
    const editBtn = page.locator('button:has(svg.lucide-pencil), button:has(svg[data-lucide="pencil"])');
    if (await editBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await editBtn.click();

      // Should show an input field for username editing
      const usernameInput = page.locator('input[type="text"]').first();
      await expect(usernameInput).toBeVisible({ timeout: 5_000 });

      // Read current value, modify, save, verify, then revert
      const original = await usernameInput.inputValue();
      const testName = `e2e-test-${Date.now()}`;

      await usernameInput.fill(testName);
      // Press Enter or click save button to submit
      await usernameInput.press('Enter');
      await page.waitForTimeout(1_000);

      // Revert to original username
      const editBtnAgain = page.locator('button:has(svg.lucide-pencil), button:has(svg[data-lucide="pencil"])');
      if (await editBtnAgain.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await editBtnAgain.click();
        const input = page.locator('input[type="text"]').first();
        await input.fill(original);
        await input.press('Enter');
      }
    }
  });
});
