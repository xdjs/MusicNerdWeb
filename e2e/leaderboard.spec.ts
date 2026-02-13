import { test, expect } from '@playwright/test';
import { dismissLegacyModal } from './helpers/auth';
import { TEST_ACCOUNTS } from './helpers/test-data';

// Requires: PR #976 merged (restores leaderboard page from stub)

test.describe('Leaderboard', () => {
  test('page renders with heading and range buttons', async ({ page }) => {
    await page.goto('/leaderboard');

    // Should show leaderboard heading
    await expect(page.getByText(/leaderboard/i).first()).toBeVisible({ timeout: 15_000 });

    // Should show date range buttons
    await expect(page.getByRole('button', { name: /today/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /last week/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /last month/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /all time/i })).toBeVisible();
  });

  test('date range buttons change active state', async ({ page }) => {
    await page.goto('/leaderboard');
    await expect(page.getByRole('button', { name: /today/i })).toBeVisible({ timeout: 15_000 });

    const ranges = ['Today', 'Last Week', 'Last Month', 'All Time'];

    for (const range of ranges) {
      const btn = page.getByRole('button', { name: new RegExp(range, 'i') });
      await btn.click();
      // After clicking, button should have the active styling (bg-pastypink)
      await expect(btn).toHaveClass(/bg-pastypink/, { timeout: 5_000 });
    }
  });
});

test.describe('Leaderboard — authenticated user', () => {
  test.use({ storageState: TEST_ACCOUNTS.regular.storageState });

  test('highlights current user if they have contributions', async ({ page }) => {
    await page.goto('/leaderboard');
    await dismissLegacyModal(page);

    await expect(page.getByText(/leaderboard/i).first()).toBeVisible({ timeout: 15_000 });

    // If the user has contributions, their row is highlighted
    const userRow = page.locator('#leaderboard-current-user');
    // This element only exists if the user is on the leaderboard
    // We just verify no crash — the element may or may not be present
    const isPresent = await userRow.isVisible().catch(() => false);
    if (isPresent) {
      await expect(userRow).toHaveCSS('border-style', 'solid');
    }
  });
});
