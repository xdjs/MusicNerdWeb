import { test as setup } from '@playwright/test';
import { login } from './helpers/auth';
import { TEST_ACCOUNTS } from './helpers/test-data';

setup.setTimeout(120_000);

setup('authenticate regular user', async ({ page }) => {
  await login(page, TEST_ACCOUNTS.regular.email, TEST_ACCOUNTS.regular.otp);
  await page.context().storageState({ path: TEST_ACCOUNTS.regular.storageState });
});

setup('authenticate whitelisted user', async ({ page }) => {
  await login(page, TEST_ACCOUNTS.whitelisted.email, TEST_ACCOUNTS.whitelisted.otp);
  await page.context().storageState({ path: TEST_ACCOUNTS.whitelisted.storageState });
});

setup('authenticate admin user', async ({ page }) => {
  await login(page, TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.otp);
  await page.context().storageState({ path: TEST_ACCOUNTS.admin.storageState });
});
