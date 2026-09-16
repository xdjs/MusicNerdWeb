import { test, expect } from '@playwright/test';
import { login, fetchAsUser } from './helpers/auth';

test('live profile account data, themes, layout and persistent name', async ({page, browser, baseURL}) => {
  test.setTimeout(240_000);
  test.skip(process.env.E2E_BOOKMARK_WRITES !== '1', 'Explicit test-account writes only');
  if (!baseURL || process.env.E2E_BOOKMARK_PREVIEW_URL !== baseURL) throw new Error('Exact reviewed preview opt-in required');
  await login(page, process.env.E2E_BOOKMARK_EMAIL ?? 'test-4473@privy.io', process.env.E2E_BOOKMARK_OTP ?? '676856');
  const session = await fetchAsUser(page, '/api/auth/session');
  const accountHeaders = {'X-Profile-Account': session.body.user.id};
  const summary = await fetchAsUser(page, '/api/profile/summary', {headers: accountHeaders});
  expect(summary.status).toBe(200);
  const photo = await fetchAsUser(page, '/api/user/profile-image', {headers: accountHeaders});
  expect(photo.status).toBe(200);
  await page.goto('/profile');
  await expect(page.getByRole('button', {name:'Edit profile', exact:true})).toBeVisible({timeout:30_000});
  await page.getByRole('button', {name:'Edit profile', exact:true}).click();
  const name = page.getByLabel('Display name');
  const original = await name.inputValue();
  await name.fill('Profile Review');
  await page.getByRole('button', {name:'Save changes', exact:true}).click();
  await expect(page.getByRole('dialog', {name:'Edit profile'})).toHaveCount(0, {timeout:30_000});
  try {
    await page.reload();
    await expect(page.getByRole('heading', {name:'Profile Review', exact:true})).toBeVisible({timeout:30_000});
    for (const width of [390,832]) for (const theme of ['light','dark']) {
      const context = await browser.newContext({baseURL, viewport:{width,height:844}, deviceScaleFactor:2, isMobile:width===390, hasTouch:width===390});
      await context.addCookies(await page.context().cookies());
      await context.addInitScript(t => localStorage.setItem('musicnerd-theme',t), theme);
      const view = await context.newPage();
      try {
        await view.goto('/profile');
        await expect(view.getByRole('button',{name:'Edit profile',exact:true})).toBeVisible({timeout:30_000});
        await expect(view.getByText('Sample activity',{exact:true})).toHaveCount(0);
        expect(await view.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await view.locator('main').last().screenshot({path:`test-results/profile-${width}-${theme}.png`,mask:[view.locator('main header p').first()],maskColor:'#888888'});
        await view.getByRole('button',{name:'Edit profile',exact:true}).click();
        const edit = view.getByRole('dialog',{name:'Edit profile'});
        await expect(edit.getByRole('button',{name:'Save changes'})).toBeVisible();
        await edit.screenshot({path:`test-results/profile-edit-${width}-${theme}.png`});
        await edit.getByRole('button',{name:'Cancel',exact:true}).click();
      } finally { await context.close(); }
    }
  } finally {
    await page.getByRole('button',{name:'Edit profile',exact:true}).click();
    await page.getByLabel('Display name').fill(original);
    await page.getByRole('button',{name:'Save changes',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'Edit profile'})).toHaveCount(0,{timeout:30_000});
  }
});
