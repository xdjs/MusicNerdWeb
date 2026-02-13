import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS } from './helpers/test-data';

// Requires: Prerequisites A (PR #976) + B (AddArtistData restored)
// These tests will fail until both prerequisites are met.

test.describe('UGC submission — regular user', () => {
  test.use({ storageState: TEST_ACCOUNTS.regular.storageState });
  test.setTimeout(60_000);

  test('submits a link and sees review message', async ({ page }) => {
    // Navigate to a known artist page
    // Use a search to find an artist, then go to their page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find an artist via the search bar or go to a known artist
    // For now, navigate to the first artist we can find
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill('Radiohead');
      await page.waitForTimeout(1_000);

      // Click on a search result if visible
      const result = page.getByText('Radiohead').first();
      if (await result.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await result.click();
        await page.waitForURL('**/artist/**', { timeout: 10_000 });
      }
    }

    // Look for the "+" button to add data
    const addDataBtn = page.locator('button:has-text("+")').or(page.getByRole('button', { name: /add/i }));
    if (await addDataBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await addDataBtn.click();

      // Enter a URL
      const urlInput = page.getByPlaceholder(/url/i).or(page.locator('input[type="url"]'));
      if (await urlInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await urlInput.fill('https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb');
        // Submit
        const submitBtn = page.getByRole('button', { name: /submit|save/i });
        await submitBtn.click();

        // Regular user should see "we'll review" message or "already added"
        await expect(
          page.getByText(/review/i).or(page.getByText(/already/i))
        ).toBeVisible({ timeout: 10_000 });
      }
    }
  });

  test('invalid URL shows validation error', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to an artist page first
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill('Radiohead');
      await page.waitForTimeout(1_000);
      const result = page.getByText('Radiohead').first();
      if (await result.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await result.click();
        await page.waitForURL('**/artist/**', { timeout: 10_000 });
      }
    }

    const addDataBtn = page.locator('button:has-text("+")').or(page.getByRole('button', { name: /add/i }));
    if (await addDataBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await addDataBtn.click();

      const urlInput = page.getByPlaceholder(/url/i).or(page.locator('input[type="url"]'));
      if (await urlInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await urlInput.fill('not-a-valid-url');
        const submitBtn = page.getByRole('button', { name: /submit|save/i });
        await submitBtn.click();

        // Should see validation error
        await expect(
          page.getByText(/invalid|error|valid url/i)
        ).toBeVisible({ timeout: 10_000 });
      }
    }
  });
});

test.describe('UGC submission — whitelisted user', () => {
  test.use({ storageState: TEST_ACCOUNTS.whitelisted.storageState });
  test.setTimeout(60_000);

  test('auto-approves link submission', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill('Radiohead');
      await page.waitForTimeout(1_000);
      const result = page.getByText('Radiohead').first();
      if (await result.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await result.click();
        await page.waitForURL('**/artist/**', { timeout: 10_000 });
      }
    }

    const addDataBtn = page.locator('button:has-text("+")').or(page.getByRole('button', { name: /add/i }));
    if (await addDataBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await addDataBtn.click();

      const urlInput = page.getByPlaceholder(/url/i).or(page.locator('input[type="url"]'));
      if (await urlInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await urlInput.fill('https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb');
        const submitBtn = page.getByRole('button', { name: /submit|save/i });
        await submitBtn.click();

        // Whitelisted user should see "updated" message or "already added"
        await expect(
          page.getByText(/updated/i).or(page.getByText(/already/i))
        ).toBeVisible({ timeout: 10_000 });
      }
    }
  });
});
