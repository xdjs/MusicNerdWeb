import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

const ADMIN_EMAIL = 'test-6184@privy.io';
const ADMIN_OTP = '413532';

// Run serially — all tests share the same Privy account
test.describe.configure({ mode: 'serial' });

test.describe('Agent Work Admin Tab', () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_OTP);
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible({ timeout: 15_000 });
    // Click Agent Work tab and wait for data
    await page.getByRole('tab', { name: 'Agent Work' }).click();
    // Wait for the API response to complete
    await page.waitForResponse(
      (res) => res.url().includes('/api/admin/agent-work') && res.status() === 200,
      { timeout: 15_000 },
    );
  });

  test('tab loads and shows platform coverage stats', async ({ page }) => {
    // Platform stats section should be visible
    const statsHeading = page.locator('h3', { hasText: 'Platform Coverage' });
    await expect(statsHeading).toBeVisible({ timeout: 5_000 });

    // At least one platform card with a percentage
    const deezerCard = page.locator('.rounded-md.border.bg-card.p-3', { hasText: 'deezer' });
    await expect(deezerCard).toBeVisible();
    await expect(deezerCard.locator('text=/%/')).toBeVisible();
  });

  test('agent breakdown table has rows', async ({ page }) => {
    const heading = page.locator('h3', { hasText: 'Per-Agent Breakdown' });
    await expect(heading).toBeVisible({ timeout: 5_000 });

    // At least one agent row
    const table = heading.locator('~ div table');
    const rows = table.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 5_000 });

    // Row should have a resolved count > 0
    const firstRowCells = rows.first().locator('td');
    const resolvedCount = await firstRowCells.nth(1).textContent();
    expect(Number(resolvedCount)).toBeGreaterThan(0);
  });

  test('audit log renders entries with action badges', async ({ page }) => {
    const heading = page.locator('h3', { hasText: 'Recent Audit Log' });
    await expect(heading).toBeVisible({ timeout: 5_000 });

    // Audit table should have rows
    const table = heading.locator('~ div table');
    const rows = table.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 5_000 });

    // Action badges should be present
    const badges = page.locator('span.rounded.text-xs.font-medium');
    await expect(badges.first()).toBeVisible();
  });

  test('audit log pagination works', async ({ page }) => {
    // Check if pagination controls exist (only if total > limit)
    const nextBtn = page.getByRole('button', { name: 'Next' });
    const prevBtn = page.getByRole('button', { name: 'Previous' });

    const hasNextBtn = await nextBtn.isVisible().catch(() => false);
    if (!hasNextBtn) {
      test.skip(true, 'Not enough audit entries for pagination');
      return;
    }

    // Previous should be disabled on page 1
    await expect(prevBtn).toBeDisabled();
    await expect(page.getByText('Page 1 of')).toBeVisible();

    // Click Next and wait for the API call
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('auditPage=2') && res.status() === 200,
      { timeout: 10_000 },
    );
    await nextBtn.click();
    await responsePromise;

    // Page 2 should now be shown
    await expect(page.getByText('Page 2 of')).toBeVisible();
    await expect(prevBtn).toBeEnabled();
  });

  test('exclusions section renders', async ({ page }) => {
    const heading = page.locator('h3', { hasText: 'Exclusions' });
    await expect(heading).toBeVisible({ timeout: 5_000 });

    // Look for a platform button (collapsible)
    const platformBtn = page.locator('button', { hasText: /^(deezer|apple_music|musicbrainz)/ });
    const hasPlatform = await platformBtn.first().isVisible().catch(() => false);

    if (!hasPlatform) {
      // No exclusions recorded — that's valid, just check the empty message
      await expect(page.getByText('No exclusions recorded')).toBeVisible();
      return;
    }

    // Expand and verify table content
    await platformBtn.first().click();
    const reasonCell = page.locator('text=/name_mismatch|too_ambiguous|conflict/');
    await expect(reasonCell.first()).toBeVisible({ timeout: 5_000 });
  });

  test('artist names in audit log are links', async ({ page }) => {
    const heading = page.locator('h3', { hasText: 'Recent Audit Log' });
    await expect(heading).toBeVisible({ timeout: 5_000 });

    // Find an artist link in the audit log
    const table = heading.locator('~ div table');
    const artistLink = table.locator('a[href^="/artist/"]').first();
    await expect(artistLink).toBeVisible({ timeout: 5_000 });

    const href = await artistLink.getAttribute('href');
    expect(href).toMatch(/^\/artist\/[a-f0-9-]+$/);
  });
});
