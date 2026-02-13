import { test, expect } from '@playwright/test';
import { dismissLegacyModal } from './helpers/auth';
import { TEST_ACCOUNTS, SPOTIFY_IDS } from './helpers/test-data';

// Requires: PR #976 merged (restores add-artist page from stub)

test.describe('Add Artist — unauthenticated', () => {
  test('redirects to home when not logged in', async ({ page }) => {
    await page.goto(`/add-artist?spotify=${SPOTIFY_IDS.radiohead}`);

    // Server-side redirect for unauthenticated users
    await page.waitForURL('**/');
    expect(page.url()).toMatch(/\/$/);
  });
});

test.describe('Add Artist — authenticated', () => {
  test.use({ storageState: TEST_ACCOUNTS.regular.storageState });
  test.setTimeout(60_000);

  test('shows artist info for valid Spotify ID', async ({ page }) => {
    await page.goto(`/add-artist?spotify=${SPOTIFY_IDS.radiohead}`);
    await dismissLegacyModal(page);

    // Should show Radiohead's info from Spotify API
    await expect(page.getByRole('heading', { name: /Radiohead/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/followers/i)).toBeVisible();
  });

  test('add existing artist redirects to artist page', async ({ page }) => {
    await page.goto(`/add-artist?spotify=${SPOTIFY_IDS.radiohead}`);
    await dismissLegacyModal(page);

    await expect(page.getByRole('heading', { name: /Radiohead/i })).toBeVisible({ timeout: 15_000 });

    // Click "Add Artist" button
    const addBtn = page.getByRole('button', { name: /add artist/i });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Dismiss modal again if it reappears after navigation
    await dismissLegacyModal(page);

    // Should redirect to /artist/[id] (Radiohead likely exists in the DB)
    await page.waitForURL('**/artist/**', { timeout: 15_000 });
    expect(page.url()).toContain('/artist/');
  });

  test('shows error for invalid Spotify ID', async ({ page }) => {
    await page.goto('/add-artist?spotify=invalid-id-that-does-not-exist');
    await dismissLegacyModal(page);

    // Should show an error message
    await expect(page.getByText(/failed|error|not found/i)).toBeVisible({ timeout: 15_000 });
  });

  test('shows error when no Spotify ID provided', async ({ page }) => {
    await page.goto('/add-artist');
    await dismissLegacyModal(page);

    // Should show "No Spotify ID provided" or redirect
    const noIdMsg = page.getByText(/no spotify id/i);
    const redirected = page.url().match(/\/$/);
    expect(await noIdMsg.isVisible().catch(() => false) || redirected).toBeTruthy();
  });
});
