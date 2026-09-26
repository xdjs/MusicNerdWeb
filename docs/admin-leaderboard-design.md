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

### September 26 review update — per-submission approval
Pete requested light-mode previews and an Approve button on each link submission. Each button sends only that submission’s ID through the existing authorized admin action; bulk approval remains available. While a request is pending, approval controls are disabled to prevent duplicate requests. Successful rows leave the local queue, unrelated selections remain attached to submission IDs, and the server refresh reconciles counts. Errors remain visible and allow retry; partial bulk failures refresh the queue without reporting complete success. On phones each submission stacks into an individual review row, keeping its full proposed URL and Approve button visible together. The local sample preview simulates approvals in memory only.

September 26 mobile navigation feedback: replace the horizontal tab rail below 768px with a full-width section picker. All six destinations and pending counts appear in a vertical menu; selecting an item updates the existing shared tab state. Desktop keeps its sidebar. No data, action, or authorization changes.

Artist claims also use stacked review cards below 768px: artist and status first, labeled ownership/reference details, then visible 44px Approve and Reject controls. Existing claim actions and revoke confirmation remain unchanged. Status filters fit a two-column grid.

September 26 full admin usability pass (Pete): use one search per section; explicit result counts and reset controls; mobile cards for People, API keys, and agent detail tables. Link review supports artist/contributor/URL search, platform and oldest/newest order. Claims supports artist/requester/reference search with status counts. People combines identity search with role and independent leaderboard-visibility filters; filters reset selection/page so a hidden row cannot be acted on. Keys supports label/prefix search and status. Artist data and agent details offer focus selectors rather than duplicating page navigation. Preserve all existing authorization, query scope, and mutation semantics.

The mobile pass uses consistent native-select chevrons inset 16px, 44px minimum controls, and explicit filter result counts. People contact details expand within their card; agent numeric records use two columns. Local verification covers all six populated sections at 320/390/832px in light/dark, with no page/console errors, horizontal mobile table overflow, or live POST requests. Filter intersection/reset, People selection/page reset, key confirmation/cancel, and all agent detail views were exercised. Full suite: 322 suites, 3042 passed, 6 skipped; later presentation changes also passed typecheck and all 20 focused admin tests.

September 26 desktop review: Pete reported horizontally clipped People and Run History tables. People now uses a fixed-width three-field table (person, role, updated) plus selection, with full contact/account data expandable inside the person cell at every width. Run history uses a responsive record with worker/date/status and the key metrics visible, plus expandable skipped/turn counts and visible failure reasons. Both must fit the workspace at tablet and desktop widths with no horizontal scrolling, including with expanded details.

September 26 deployed-preview correction: real claims data exposed a desktop-only overflow missed by the earlier page-width checks. Pete requires every admin board to fit without horizontal scrolling. Claims use labeled review records at every width, arranged in three columns when the panel has room. Agent breakdown/audit/exclusions also use wrapping labeled records; long values remain readable. Other tables size to the available panel, with submission/key/People layouts adapting to the panel width rather than the viewport alone. Verification must measure inner table containers and action bounds, not only page overflow.
