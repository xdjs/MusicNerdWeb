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
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const session = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/auth/session');
        return await res.json();
      } catch { return {}; }
    });
    if (session?.user?.id) return;
    await page.waitForTimeout(1_000);
  }
  throw new Error('Login failed: session not established within 30 seconds');
}

export async function fetchAsUser(
  page: Page,
  url: string,
  init?: { method?: string; body?: string; headers?: Record<string, string> },
) {
  return page.evaluate(
    async ({ url, init }) => {
      const res = await fetch(url, {
        method: init?.method || 'GET',
        headers: { 'Content-Type': 'application/json', ...init?.headers },
        body: init?.body,
      });
      const text = await res.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch {}
      return { status: res.status, body: json ?? text };
    },
    { url, init },
  );
}
