import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

const ADMIN_EMAIL = 'test-6184@privy.io';
const ADMIN_OTP = '413532';

// Unique suffix per test run to avoid collisions from previous runs
const RUN_ID = Date.now().toString(36);

// Run serially — all tests share the same Privy account and create/revoke real keys
test.describe.configure({ mode: 'serial' });

test.describe('MCP API Key Management', () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_OTP);
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible({ timeout: 15_000 });
  });

  test('MCP Keys tab is visible and navigable', async ({ page }) => {
    const mcpTab = page.getByRole('tab', { name: 'MCP Keys' });
    await expect(mcpTab).toBeVisible();
    await mcpTab.click();

    await expect(page.getByText('MCP API Keys')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Key' })).toBeVisible();
  });

  test('all three tabs are present', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /UGC/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Users' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'MCP Keys' })).toBeVisible();
  });

  test('create key flow shows raw key and it appears in table', async ({ page, context }) => {
    const label = `e2e-create-${RUN_ID}`;

    // Grant clipboard permissions for the copy test
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Navigate to MCP Keys tab
    await page.getByRole('tab', { name: 'MCP Keys' }).click();
    await expect(page.getByText('MCP API Keys')).toBeVisible();

    // Open create dialog
    await page.getByRole('button', { name: 'Create Key' }).click();

    // Verify dialog is open
    await expect(page.getByRole('heading', { name: 'Create MCP API Key' })).toBeVisible();

    // Enter label
    const labelInput = page.getByPlaceholder('Key label');
    await expect(labelInput).toBeVisible();
    await labelInput.fill(label);

    // Submit
    await page.getByRole('button', { name: 'Create' }).click();

    // Verify raw key is shown
    await expect(page.getByRole('heading', { name: 'API Key Created' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Copy this key now')).toBeVisible();

    // Verify the raw key is displayed (64 hex chars)
    const keyDisplay = page.locator('code.select-all');
    await expect(keyDisplay).toBeVisible();
    const rawKey = await keyDisplay.textContent();
    expect(rawKey).toMatch(/^[a-f0-9]{64}$/);

    // Copy button works
    await page.getByRole('button', { name: 'Copy' }).click();
    await expect(page.getByRole('button', { name: 'Copied!' })).toBeVisible({ timeout: 3_000 });

    // Dismiss dialog
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByRole('heading', { name: 'API Key Created' })).not.toBeVisible();

    // Verify key appears in table
    const newRow = page.locator('table tbody tr', { hasText: label });
    await expect(newRow).toBeVisible();
    await expect(newRow.getByText('Active')).toBeVisible();
  });

  test('revoke key flow with confirmation', async ({ page }) => {
    const label = `e2e-revoke-${RUN_ID}`;

    // Navigate to MCP Keys tab
    await page.getByRole('tab', { name: 'MCP Keys' }).click();
    await expect(page.getByText('MCP API Keys')).toBeVisible();

    // First create a key to revoke
    await page.getByRole('button', { name: 'Create Key' }).click();
    await page.getByPlaceholder('Key label').fill(label);
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('heading', { name: 'API Key Created' })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Done' }).click();

    // Find the row with our key and click Revoke
    const targetRow = page.locator('table tbody tr', { hasText: label });
    await expect(targetRow.getByText('Active')).toBeVisible();
    await targetRow.getByRole('button', { name: 'Revoke' }).click();

    // Verify confirmation dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Revoke API Key' })).toBeVisible();
    await expect(dialog.getByText(label)).toBeVisible();
    await expect(dialog.getByText('This action is permanent')).toBeVisible();

    // Cancel first — key should remain active
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Revoke API Key' })).not.toBeVisible();
    await expect(targetRow.getByText('Active')).toBeVisible();

    // Now actually revoke
    await targetRow.getByRole('button', { name: 'Revoke' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Listen for the revoke API call
    const revokePromise = page.waitForResponse(
      (res) => res.url().includes('/mcp-keys/') && res.url().includes('/revoke'),
      { timeout: 15_000 },
    );

    // The dialog has Cancel and Revoke (destructive). Click the destructive one.
    await page.getByRole('dialog').getByRole('button', { name: /^Revoke$/ }).click();

    // Wait for API response
    const revokeRes = await revokePromise;
    expect(revokeRes.status()).toBe(200);

    // Dialog should close and key should show as revoked
    await expect(targetRow.getByText('Revoked')).toBeVisible({ timeout: 10_000 });
    // Revoke button should no longer be visible for this key
    await expect(targetRow.getByRole('button', { name: 'Revoke' })).not.toBeVisible();
  });

  test('create key requires label', async ({ page }) => {
    await page.getByRole('tab', { name: 'MCP Keys' }).click();
    await page.getByRole('button', { name: 'Create Key' }).click();

    // Create button should be disabled when label is empty
    const createBtn = page.getByRole('button', { name: 'Create' });
    await expect(createBtn).toBeDisabled();

    // Type whitespace-only — should still be disabled
    await page.getByPlaceholder('Key label').fill('   ');
    await expect(createBtn).toBeDisabled();

    // Type a real label — should be enabled
    await page.getByPlaceholder('Key label').fill('valid-label');
    await expect(createBtn).toBeEnabled();
  });

  test('create dialog can be cancelled', async ({ page }) => {
    await page.getByRole('tab', { name: 'MCP Keys' }).click();
    await page.getByRole('button', { name: 'Create Key' }).click();
    await expect(page.getByRole('heading', { name: 'Create MCP API Key' })).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Create MCP API Key' })).not.toBeVisible();
  });

  test('tab switching preserves content', async ({ page }) => {
    // Start on UGC tab (default)
    await expect(page.getByText('Pending UGC Submissions')).toBeVisible();

    // Switch to MCP Keys
    await page.getByRole('tab', { name: 'MCP Keys' }).click();
    await expect(page.getByText('MCP API Keys')).toBeVisible();
    await expect(page.getByText('Pending UGC Submissions')).not.toBeVisible();

    // Switch to Users
    await page.getByRole('tab', { name: 'Users' }).click();
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
    await expect(page.getByText('MCP API Keys')).not.toBeVisible();

    // Switch back to UGC
    await page.getByRole('tab', { name: /UGC/ }).click();
    await expect(page.getByText('Pending UGC Submissions')).toBeVisible();
  });
});
