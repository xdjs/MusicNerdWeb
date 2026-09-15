import { expect, test } from '@playwright/test';

// Browser fixtures test rendering only. Query/API tests cover eligibility before
// pagination; these intercepts never write accounts or contributions to a database.
const contributors = [
    { userId: 'ugc-only', wallet: 'ugc-only', username: 'UGC Only', email: null, ugcCount: 2, artistsCount: 0, isHidden: false },
    { userId: 'artist-only', wallet: 'artist-only', username: 'Artist Only', email: null, ugcCount: 0, artistsCount: 1, isHidden: false },
];

for (const width of [832, 390]) {
    for (const theme of ['light', 'dark']) {
        test.describe(`${width}px ${theme}`, () => {
            test.use({ viewport: { width, height: 844 }, deviceScaleFactor: width === 390 ? 2 : 1, isMobile: width === 390, hasTouch: width === 390 });

            test.beforeEach(async ({ page }) => {
                await page.addInitScript(value => localStorage.setItem('musicnerd-theme', value), theme);
                // A signed-in account with no eligible contributions must not be
                // inserted into either the empty list or a two-person podium.
                await page.route('**/api/auth/session', route => route.fulfill({ json: {
                    user: { id: 'inactive-account', name: 'Inactive Account' }, expires: '2099-01-01T00:00:00Z',
                } }));
                await page.route('**/api/user/inactive-account', route => route.fulfill({ json: {
                    id: 'inactive-account', wallet: 'inactive-account', username: 'Inactive Account',
                    email: null, isHidden: false, isAdmin: false, isWhiteListed: false,
                } }));
            });

            for (const empty of [false, true]) {
                test(empty ? 'empty periods' : 'two-person podium', async ({ page }, testInfo) => {
                    await page.route('**/api/leaderboard?*', route => route.fulfill({ json: {
                        entries: empty ? [] : contributors, total: empty ? 0 : 2, pageCount: empty ? 0 : 1,
                    } }));
                    await page.goto('/leaderboard');
                    await expect(page.getByText('Rank:', { exact: true })).toBeVisible();
                    for (const label of ['Today', 'Last Week', 'Last Month', 'All Time']) {
                        const response = label === 'Today' ? null : page.waitForResponse(resp =>
                            resp.url().includes('/api/leaderboard?') && resp.url().includes('page=1'));
                        await page.getByRole('button', { name: label, exact: true }).click();
                        if (response) await response;
                        if (empty) {
                            await expect(page.getByText('No contributions in this period yet. Be the first!')).toBeVisible();
                            await expect(page.locator('[data-podium]')).toHaveCount(0);
                        } else {
                            await expect(page.locator('[data-podium="true"]')).toHaveCount(2);
                            await expect(page.getByText('UGC Only', { exact: true }).filter({ visible: true })).toBeVisible();
                            await expect(page.getByText('Artist Only', { exact: true }).filter({ visible: true })).toBeVisible();
                            await expect(page.getByText('🥉', { exact: true })).toHaveCount(0);
                        }
                        await expect(page.getByText('Rank:', { exact: true }).locator('..')).toContainText('—');
                        await expect(page.getByText('UGC Added:', { exact: true }).locator('..')).toContainText('0');
                        await expect(page.getByText('Artists Added:', { exact: true }).locator('..')).toContainText('0');
                        await expect(page.locator('#leaderboard-current-user')).toHaveCount(0);
                        await expect(page.getByRole('button', { name: 'Next', exact: true })).toHaveCount(0);
                    }
                    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
                    await page.mouse.move(0, 0);
                    await page.getByRole('heading', { name: 'Leaderboard', exact: true }).locator('../..')
                        .screenshot({ path: testInfo.outputPath('leaderboard.png') });
                });
            }
        });
    }
}
