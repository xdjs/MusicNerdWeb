import {test,expect} from '@playwright/test';
import {login} from './helpers/auth';
const artists=[
 {artistId:'8d23642c-4e04-4652-8551-fbda0be8777f',artistName:'Hakeem Romance',imageUrl:null},
 {artistId:'2b149220-b7c1-4b86-9a76-b5d96f359bd8',artistName:'Spearfisher',imageUrl:null},
 {artistId:'baa7dd84-772b-480a-83e7-114ae183eaf7',artistName:'Pharaoh Sistare',imageUrl:null},
];
test('suggestions use real provider photos and preserve missing-photo fallback',async({page,browser,baseURL})=>{
 test.setTimeout(180_000);
 test.skip(!process.env.E2E_PROFILE_IMAGES,'Opt in against the staging-data preview');
 await login(page,process.env.E2E_BOOKMARK_EMAIL??'test-4473@privy.io',process.env.E2E_BOOKMARK_OTP??'676856');
 for(const width of [390,832]) for(const theme of ['light','dark']) {
  const context=await browser.newContext({baseURL,viewport:{width,height:844},deviceScaleFactor:2,isMobile:width===390,hasTouch:width===390});
  await context.addCookies(await page.context().cookies());
  await context.addInitScript(t=>localStorage.setItem('musicnerd-theme',t),theme);
  const view=await context.newPage();
  try {
   // Only suggestion membership is a fixture; public artist records and image
   // resolution are real. No account contributions/bookmarks are written.
   await view.route('**/api/profile/summary',async route=>{const response=await route.fetch();expect(response.status()).toBe(200);await route.fulfill({response,json:{...await response.json(),suggestions:artists}});});
   await view.goto('/profile');
   const section=view.getByRole('heading',{name:'Start with artists you’ve helped'}).locator('..');
   await expect(section).toBeVisible({timeout:30_000});
   for(const artist of artists.slice(0,2)) {
    const row=section.getByRole('link',{name:artist.artistName,exact:true});
    await expect(row).toHaveAttribute('href',`/artist/${artist.artistId}`);
    await expect.poll(()=>row.locator('img').evaluateAll(images=>images.some(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0)),{timeout:30_000}).toBe(true);
   }
   await expect(section.getByText('PS',{exact:true})).toBeVisible({timeout:30_000});
   expect(await view.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await section.screenshot({path:`test-results/profile-artist-images-${width}-${theme}.png`});
   await section.getByRole('link',{name:'Spearfisher',exact:true}).click();
   await expect(view).toHaveURL(new RegExp(`/artist/${artists[1].artistId}$`));
   await expect(view.getByRole('heading',{name:'Spearfisher',exact:true}).first()).toBeVisible({timeout:30_000});
  } finally {await context.close();}
 }
});
