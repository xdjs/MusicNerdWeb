import { type Page, expect } from '@playwright/test';

/**
 * Log in via Privy email + OTP flow.
 * Navigates to the app, clicks the login button, enters email and OTP
 * through the Privy modal, and waits for an authenticated NextAuth session.
 */
export async function login(page: Page, email: string, otp: string) {
  await page.goto('/');

  // Click the login button (Mail icon button) — opens dropdown menu
  await page.click('#login-btn');

  // Click "Log In" from the dropdown menu to trigger Privy modal
  await page.getByRole('menuitem', { name: 'Log In' }).click();

  // Privy modal opens — enter email
  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
  await emailInput.fill(email);
  await emailInput.press('Enter');

  // Wait for OTP dialog to appear
  const otpHeading = page.getByRole('heading', { name: 'Enter confirmation code' });
  await otpHeading.waitFor({ state: 'visible', timeout: 15_000 });

  // Enter OTP digits — Privy uses individual textbox inputs inside the dialog
  const dialog = page.getByRole('dialog');
  const otpInputs = dialog.getByRole('textbox');
  const count = await otpInputs.count();

  if (count >= 6) {
    // Individual digit inputs (6 separate textboxes)
    for (let i = 0; i < otp.length; i++) {
      await otpInputs.nth(i).fill(otp[i]);
    }
  } else if (count === 1) {
    // Single OTP input
    await otpInputs.first().fill(otp);
    await otpInputs.first().press('Enter');
  }

  // Wait for authenticated state — the profile button (with avatar image) appears
  await expect(page.locator('img[alt="Profile"]')).toBeVisible({ timeout: 15_000 });
}

/**
 * Make an API request using the browser's authenticated session cookies.
 * Returns the parsed Response.
 */
export async function fetchAsUser(
  page: Page,
  url: string,
  init?: { method?: string; body?: string; headers?: Record<string, string> },
) {
  const result = await page.evaluate(
    async ({ url, init }) => {
      const res = await fetch(url, {
        method: init?.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers,
        },
        body: init?.body,
      });
      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {}
      return { status: res.status, body: json ?? text };
    },
    { url, init },
  );

  return result;
}
