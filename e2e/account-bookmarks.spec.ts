import { test, expect } from '@playwright/test';
import { login, fetchAsUser } from './helpers/auth';

// Opt-in writes to the configured TEST account only. Run against the local app
// after confirming it targets dev and applying the additive bookmark migration.
// For a reviewed Vercel preview, E2E_BOOKMARK_PREVIEW_URL must exactly match E2E_BASE_URL.
const enabled = process.env.E2E_BOOKMARK_WRITES === '1';
const artistId = process.env.LATEST_ARTIST_ID;
const testEmail = process.env.E2E_BOOKMARK_EMAIL ?? 'test-4473@privy.io';
const testOtp = process.env.E2E_BOOKMARK_OTP ?? '676856';

test.describe('Account bookmarks across browser contexts', () => {
    test.setTimeout(240_000);
    test.skip(!enabled || !artistId, 'Opt in with E2E_BOOKMARK_WRITES=1 and LATEST_ARTIST_ID after preparing dev.');

    test('save on artist page, see it on another device, search and remove from the real profile', async ({ page, browser, baseURL }) => {
        const reviewedPreview = !!baseURL && process.env.E2E_BOOKMARK_PREVIEW_URL === baseURL && new URL(baseURL).hostname.endsWith('-musicnerd.vercel.app');
        if (!baseURL || (!['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname) && !reviewedPreview)) {
            throw new Error('Verify the app targets dev; preview writes require an exact E2E_BOOKMARK_PREVIEW_URL opt-in.');
        }
        await login(page, testEmail, testOtp);
        const session = await fetchAsUser(page, '/api/auth/session');
        const userId = session.body.user.id as string;
        const headers = { 'X-Bookmark-Account': userId };
        const before = await fetchAsUser(page, '/api/bookmarks', { headers });
        expect(before.status).toBe(200);
        test.skip(before.body.bookmarks.some((item: { artistId: string }) => item.artistId === artistId), 'Choose an artist not already saved by this test account; do not alter an existing bookmark.');

        // The second browser shares only login cookies, not localStorage or query cache.
        const second = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
        await second.addCookies(await page.context().cookies());
        const otherDevice = await second.newPage();
        try {
            await page.goto(`/artist/${artistId}`);
            const button = page.getByRole('button', { name: 'Bookmark', exact: true });
            await expect(button).toBeEnabled();
            await button.click();
            await expect(page.getByRole('button', { name: 'Bookmarked', exact: true })).toHaveAttribute('aria-pressed', 'true');

            await otherDevice.goto('/profile');
            const panel = otherDevice.getByRole('region', { name: /^Your artists \d/ });
            const savedLink = panel.locator(`a[href="/artist/${artistId}"]`);
            await expect(savedLink).toBeVisible();
            expect(await otherDevice.evaluate(id => localStorage.getItem(`bookmarks_${id}`), userId)).toBeNull();
            await panel.screenshot({ path: 'test-results/account-bookmarks.png' });
            const updates = await fetchAsUser(otherDevice, '/api/profile/updates?kind=All', {headers: {'X-Profile-Account': userId}});
            expect(updates.status).toBe(200);
            expect(updates.body.items.some((item: {artistId: string}) => item.artistId === artistId)).toBe(true);
            const artistName = (await savedLink.innerText()).trim();

            await panel.getByRole('button', { name: 'Search collection' }).click();
            const collection = otherDevice.getByRole('dialog');
            await collection.getByRole('textbox', {name: 'Search bookmarked artists'}).fill(artistName);
            await collection.getByRole('button', {name: 'Remove bookmark', exact: true}).click();
            await expect(collection.locator(`a[href="/artist/${artistId}"]`)).toHaveCount(0);
            await otherDevice.keyboard.press('Escape');
            await page.reload();
            await expect(page.getByRole('button', { name: 'Bookmark', exact: true })).toHaveAttribute('aria-pressed', 'false', { timeout: 30_000 });
            await panel.getByRole('button', {name: 'Find artists', exact: true}).click();
            const finder = otherDevice.getByRole('dialog', {name: 'Find artists'});
            await finder.getByRole('textbox', {name: 'Search artists to bookmark'}).fill(artistName);
            await finder.getByRole('button', {name: `Bookmark ${artistName}`, exact: true}).click();
            await expect(finder.getByRole('button', {name: `Bookmarked ${artistName}`, exact: true})).toBeVisible();
            await finder.getByRole('button', {name: 'Done'}).click();
            await expect(panel.locator(`a[href="/artist/${artistId}"]`)).toBeVisible();
            const unauthenticated = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
            try { expect((await unauthenticated.request.get('/api/bookmarks')).status()).toBe(401); }
            finally { await unauthenticated.close(); }
        } finally {
            // Only this test's newly added artist can be removed. Never replace the account list.
            const cleanup = await page.context().request.delete('/api/bookmarks', {headers, data: {artistId}});
            expect(cleanup.status()).toBe(200);
            await second.close();
        }
    });
});
