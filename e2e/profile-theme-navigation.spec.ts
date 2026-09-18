import {test,expect} from '@playwright/test';

test('concept theme follows client navigation without replacing the normal preference',async({browser,baseURL})=>{
 test.skip(process.env.E2E_THEME_PREVIEW !== '1','Explicit preview deployment only');
 test.setTimeout(120_000);
 for(const width of [390,832]) for(const normal of ['light','dark']){
  const preview=normal==='light'?'dark':'light';
  const context=await browser.newContext({baseURL,viewport:{width,height:844},deviceScaleFactor:2,isMobile:width===390,hasTouch:width===390});
  await context.addInitScript(({normal,preview})=>{localStorage.setItem('musicnerd-theme',normal);localStorage.setItem('musicnerd-profile-preview-theme',preview);},{normal,preview});
  const page=await context.newPage();
  try{
   await page.goto('/profile?preview=concept');
   await expect(page.locator('html')).toHaveClass(new RegExp(preview));
   await page.locator('a[href="/"]').first().click();
   await expect(page).toHaveURL(/\/$/);
   await expect(page.locator('html')).toHaveClass(new RegExp(normal));
   await expect(page.locator('html')).toHaveAttribute('data-profile-preview-theme','false');
   await page.screenshot({path:`test-results/release-theme-${width}-${normal}-home.png`});
   await page.goBack();
   await expect(page.locator('html')).toHaveClass(new RegExp(preview));
   // Next's native history integration handles query-only client transitions.
   await page.evaluate(()=>history.pushState(null,'','/profile'));
   await expect(page.locator('html')).toHaveClass(new RegExp(normal));
   await page.evaluate(()=>history.pushState(null,'','/profile?preview=concept'));
   await expect(page.locator('html')).toHaveClass(new RegExp(preview));
   expect(await page.evaluate(()=>localStorage.getItem('musicnerd-theme'))).toBe(normal);
   expect(await page.evaluate(()=>localStorage.getItem('musicnerd-profile-preview-theme'))).toBe(preview);
  }finally{await context.close();}
 }
});
