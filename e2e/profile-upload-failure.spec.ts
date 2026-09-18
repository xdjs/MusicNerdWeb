import { test, expect } from '@playwright/test';
import { login, fetchAsUser } from './helpers/auth';

test('failed profile photo uploads leave the saved and displayed name unchanged', async ({page, browser, baseURL}) => {
  test.setTimeout(180_000);
  test.skip(process.env.E2E_BOOKMARK_WRITES !== '1', 'Explicit test-account review only');
  if (!baseURL || process.env.E2E_BOOKMARK_PREVIEW_URL !== baseURL) throw new Error('Exact reviewed preview opt-in required');
  await login(page, process.env.E2E_BOOKMARK_EMAIL ?? 'test-4473@privy.io', process.env.E2E_BOOKMARK_OTP ?? '676856');
  const session = await fetchAsUser(page, '/api/auth/session');
  const endpoint = `/api/user/${session.body.user.id}`;
  const original = await fetchAsUser(page, endpoint);
  expect(original.status).toBe(200);
  for (const width of [390,832]) for (const theme of ['light','dark']) {
    const context = await browser.newContext({baseURL, viewport:{width,height:844}, deviceScaleFactor:2, isMobile:width===390, hasTouch:width===390});
    await context.addCookies(await page.context().cookies());
    await context.addInitScript(t => localStorage.setItem('musicnerd-theme',t), theme);
    const view = await context.newPage();
    let patches = 0;
    await view.route(`**${endpoint}`, async route => {
      if (route.request().method() === 'PATCH') { patches++; await route.abort(); }
      else await route.continue();
    });
    try {
      await view.goto('/profile');
      const editButton = view.getByRole('button',{name:'Edit profile',exact:true});
      await expect(editButton).toBeVisible({timeout:30_000});
      const header = view.locator('main header').last();
      const originalName = await header.getByRole('heading',{level:1}).innerText();
      const originalPhoto = await header.locator('img').count() ? await header.locator('img').getAttribute('src') : null;
      for (const failure of ['http','network']) {
        await view.route('**/api/user/profile-image', async route => {
          if (route.request().method() !== 'POST') return route.continue();
          if (failure === 'network') return route.abort('failed');
          await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'Simulated upload failure'})});
        });
        await editButton.click();
        const dialog = view.getByRole('dialog',{name:'Edit profile'});
        await dialog.getByLabel('Display name').fill('Upload Failure Review');
        await dialog.getByLabel('Profile photo',{exact:true}).setInputFiles({name:'review.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jh1sAAAAASUVORK5CYII=','base64')});
        await dialog.getByRole('button',{name:'Save changes',exact:true}).click();
        await expect(dialog.getByRole('alert')).toContainText('Your name has not changed.');
        expect(patches).toBe(0);
        if (failure === 'http') await dialog.screenshot({path:`test-results/profile-upload-failure-${width}-${theme}.png`});
        await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
        await expect(header.getByRole('heading',{level:1})).toHaveText(originalName);
        if (originalPhoto) await expect(header.locator('img')).toHaveAttribute('src',originalPhoto);
        await editButton.click();
        await expect(dialog.getByLabel('Display name')).toHaveValue(originalName);
        await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
        await view.unroute('**/api/user/profile-image');
      }
      expect((await fetchAsUser(view,endpoint)).body.username).toBe(original.body.username);
    } finally {await context.close();}
  }
});
