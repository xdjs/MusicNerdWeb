import { type Page } from '@playwright/test';

export async function login(page: Page, email: string, otp: string) {
  await page.goto('/');

  // Click the login button — opens dropdown menu
  await page.click('#login-btn');
  // Click "Log In" from the dropdown menu to trigger Privy modal
  await page.getByRole('menuitem', { name: 'Log In' }).click();

  // Privy modal opens — enter email
  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
  await emailInput.fill(email);

  // Click Submit button (wait for it to be enabled)
  const submitBtn = page.getByRole('button', { name: 'Submit' });
  await submitBtn.waitFor({ state: 'visible', timeout: 5_000 });
  await page.waitForFunction(
    () => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Submit');
      return btn && !btn.hasAttribute('disabled');
    },
    { timeout: 5_000 },
  );
  await submitBtn.click();

  // Wait for OTP dialog
  const otpHeading = page.getByRole('heading', { name: 'Enter confirmation code' });
  await otpHeading.waitFor({ state: 'visible', timeout: 30_000 });

  // Enter OTP digits
  const dialog = page.getByRole('dialog');
  const otpInputs = dialog.getByRole('textbox');
  const count = await otpInputs.count();

  if (count >= 6) {
    for (let i = 0; i < otp.length; i++) {
      await otpInputs.nth(i).fill(otp[i]);
    }
  } else if (count === 1) {
    await otpInputs.first().fill(otp);
    await otpInputs.first().press('Enter');
  }

  // Wait for authenticated session by polling /api/auth/session
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    const session = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/auth/session');
        return await res.json();
      } catch { return {}; }
    });
    if (session?.user?.id) break;
    await page.waitForTimeout(1_000);
  }

  // Check session was established
  const finalSession = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/auth/session');
      return await res.json();
    } catch { return {}; }
  });
  if (!finalSession?.user?.id) {
    throw new Error('Login failed: session not established within 45 seconds');
  }

  // Dismiss the LegacyAccountModal if it appears ("Welcome to Music Nerd!")
  const skipBtn = page.getByRole('button', { name: 'Skip for now' });
  if (await skipBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await skipBtn.click();
    // Wait for modal to close
    await skipBtn.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
  }
}

/**
 * Dismiss the LegacyAccountModal ("Welcome to Music Nerd!") if it appears.
 * Call this after navigating to a page with stored auth state.
 */
export async function dismissLegacyModal(page: Page) {
  const skipBtn = page.getByRole('button', { name: 'Skip for now' });
  if (await skipBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await skipBtn.click();
    await skipBtn.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
  }
}

export async function fetchAsUser(
  page: Page,
  url: string,
  init?: { method?: string; body?: string; headers?: Record<string, string> },
) {
  return page.evaluate(
    async ({ url, init }) => {
      const maxRetries = 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const res = await fetch(url, {
          method: init?.method || 'GET',
          headers: { 'Content-Type': 'application/json', ...init?.headers },
          body: init?.body,
        });
        const text = await res.text();
        let json: any = null;
        try { json = JSON.parse(text); } catch {}
        // Retry on 500/503 (typically DB connection timeouts)
        if ((res.status === 500 || res.status === 503) && attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return { status: res.status, body: json ?? text };
      }
      // Should not reach here, but just in case
      return { status: 500, body: 'Max retries exhausted' };
    },
    { url, init },
  );
}
