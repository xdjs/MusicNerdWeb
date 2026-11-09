# Admin claims deep-link fix (#1647)

Verified locally on 2026-11-09, based on main `90e5dcdfde69b40ac571ec3dffbaeb9868cadb48`.
Issue: https://github.com/xdjs/MusicNerdWeb/issues/1647

`/admin?section=claims` now initializes Artist claims on direct navigation and reload.
The page recognizes claims alongside users (People) and activity. Missing or unknown
sections still open Lore review. Legacy ugc/corrections review defaults and explicit
review-filter precedence remain unchanged. The existing server admin gate runs before
any dashboard reads. No styling, data writes, worker, provider, or authorization changes.

## Validation

- Regression reproduced before the fix: both claims routing cases failed; 16 other cases passed.
- Added 18 regressions exercising the real page, dashboard and tabs with mocked data/auth:
  sections, first query-array value, remount, legacy filters, explicit filter precedence,
  signed-out/non-admin/missing-user denial, and no dashboard reads on denial.
- Focused tests: 3 suites, 22 passing tests.
- Node 24.16.0, exact lockfile dependencies: `npm run ci` passed type-check, lint,
  coverage tests (417 suites, 3,646 passed, 6 skipped), and production build.
  Existing lint warnings and no-secret sitemap database warnings remain; build exited 0.
- Local Chromium: 1280x900 desktop and 390x900 touch/mobile, both light and dark.
  Claims direct load/reload, users/activity links, unknown fallback and ugc/corrections
  rendered correctly. Desktop tab and mobile selector interaction passed. No page errors
  or horizontal overflow. All four claims screenshots were visually inspected.
- Browser fixture used the actual page function, dashboard, tabs and styles in a disposable
  source copy, replacing auth/data imports with synthetic values and simplifying the outer
  application shell. This does not verify real login, database access, or production.
  A fixture timestamp was corrected from Date to the query's string shape before the passing run.
  Next dev reported an optional Privy `@farcaster/mini-app-solana` dependency warning
  (visible as the dev issue badge in captures); the exercised routes rendered successfully.
- Local artifacts: `/private/tmp/mn1647-ci.log`, `/private/tmp/mn1647-green.log`,
  `/private/tmp/mn1647-browser-test.log`, `/private/tmp/mn1647-{desktop,mobile}-{light,dark}.png`.
  Disposable browser harness: `/private/tmp/mnw-1647-browser/verify.cjs` and `.qa/data.ts`.

## Integration with Carl's migration

Reviewed PR #1643 at `cf04801795e5c01fbbcd659b7a6aac876f369790` and
PR #1645 at `3894cb35c193f7e0f01dffd9e86226e85675269f`.
Both replace the server dashboard page with a page that passes props to `AdminView`.
Both still map only users/activity and otherwise Lore.

A non-checkout `git merge-tree --write-tree` simulation found a content conflict in
`src/app/admin/page.tsx` with both PRs. Dashboard prop changes merged automatically.
An initial development-guide edit also conflicted with #1645; those notes were moved
here so the fix does not modify that guide. No branch was merged.

When integrating either migration:

1. Retain its new `AdminView`, `firstParam`, review/activity path helpers and `key={section}`.
2. Add `section === 'claims' ? 'claims' :` to that page's initialSection mapping.
3. Add `claims` to the new `AdminView` initialSection union, alongside the Dashboard/Tabs
   type additions in this fix. The new intermediary does not exist on this branch's base.
4. Preserve the migration's Privy/API authorization. Do not restore the old NextAuth
   session lookup or server database reads when resolving the page conflict.
5. Adapt this regression suite's auth/data mocks to the migrated AdminView boundary;
   retain the routing, reload, filter and denied-access assertions and run the migration's
   AdminView tests. The current tests intentionally cover main's current server boundary.

Branch: `codex/1647-admin-claims`. Pete authorized submission and conditional merge
after Codex GitHub review and passing checks on 2026-11-09. Track current submission,
merge and deployment state on the issue and PR. Issue-owner acceptance and real
authenticated deployment verification remain separate from local validation.
