# Admin and leaderboard design — September 25, 2026

Tracking: [#1363](https://github.com/xdjs/MusicNerdWeb/issues/1363).

Pete requested these surfaces follow the reimagined artist and user profiles. Sweetman’s revised onboarding follows his API setup and is outside this work.

## Visual direction
Reuse the profile canvas and glass surface classes. Palette: canvas #fafafa, dark canvas #191919, light ink #201b26, muted ink #675c6e, pink #ff75d8, hairline #e5dce9. Use the existing inherited sans-serif, semibold tightly spaced headings, tabular counts, left-aligned content. Pink indicates the selected period/section and your own contribution; it is not decoration on every row.

Admin layout: header → pending-review shortcuts → section navigation beside the selected workspace on desktop, above it on phones. Six existing sections retain their data and actions. The pending links table prioritizes artist, proposed link, contributor and date over internal identifiers.

Leaderboard layout: header → period controls → your position (signed in) → ranked contributors → pagination. Expand a contributor deliberately to see recent artist edits; no hover-dependent content. Empty periods invite visitors to explore artists. Ranking remains total submitted links plus artists added, including pending links; do not label it approved contributions.

## Data and interaction contract
Admin page retains its server-session and live admin-role checks before reads. Existing action and API handlers retain mutation authorization. No database/schema, job or external-service changes.

Leaderboard uses the existing unpaginated GET /api/leaderboard response once per period, then derives the visible page and signed-in position from the same snapshot. This replaces the old list request plus separate full-list rank request; no new query. Today uses local midnight, week the preceding seven days, month the preceding calendar month, all time no date bounds. Hidden contributors remain unranked. Only account IDs identify the current user on the public page.

Recent edits use GET /api/recentEdited?userId= on expansion and retain real artist links. Range requests ignore superseded responses. Errors offer retry, and never masquerade as zero contributions. No changes to stored counts or eligibility.

## Verification
Exercise the actual route and component interactions with representative local fixtures, clearly marked in the local preview. Verify 390px and 832px, light and dark, all admin tabs, filters, pagination, expansion, empty/error/retry, and existing auth/action regression tests. Fixture previews prove layout and client interaction; they do not prove production login or database integration. Keep preview-only fixtures outside production routes.

### Local verification — September 26
The actual `/leaderboard` route was exercised in Chromium with intercepted sample API/session responses; admin reused the exact `AdminDashboard` component through an ignored development-only fixture route. Both passed 832px and 390px checks in both themes, with no page errors or page-wide overflow. Keyboard expansion, linked recent artists, pagination reset, current-user focus, empty/error/retry, six admin sections, claim filtering and bulk-selection enablement passed. No approval, role change, key creation, or other mutation was submitted. Existing auth/action tests run in the full suite; real deployed login and database behavior remain unverified.
