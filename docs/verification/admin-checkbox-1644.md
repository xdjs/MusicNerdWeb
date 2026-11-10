# Admin people checkbox selection (#1644)

At container widths of 900px or less, the people table becomes a grid of cards.
The identity and selection cells must occupy separate columns. Other cells,
including an empty-result cell, span the record width. Desktop table layout
and role-mutation behavior are unchanged.

## Verification, November 10, 2026

Reconstructed from main `252e87063ae22eb6cd540f0dd1ef78cf4967c2a3` after the
previous temporary implementation could not be recovered. Previous test counts
are not evidence for this patch.

A local fixture renders the actual UsersDataTable, whitelistedColumns, Radix
checkbox and Community CSS with 12 synthetic users, including a long unbroken
username. Router refresh is stubbed and every server action throws if invoked.
No live account, database or external service is used.

- Before: center hit-testing and real pointer clicks failed at 390px and 832px;
  1440px passed. The identity cell intercepted the click.
- After: 390px, 832px and 1440px pass in light and dark themes. Pointer select,
  deselect, keyboard Space, filtered selection, empty search, clearing filters
  and pagination pass. No browser errors observed.
- Scoped Jest: 3 suites / 6 tests pass (PeopleSelectionLayout, PeopleFilters,
  filterPeople). The CSS structural guard complements browser hit-testing;
  JSDOM alone cannot detect overlapping grid cells.
- Fresh aggregate `npm run ci` passed on Node 24.21.0 / npm 11.19.0 after
  installing the exact lockfile: type checking, lint (warnings only), 418 Jest
  suites (3,648 passed, 6 skipped), and optimized production build. Stub service
  values prove compilation, not live integrations. The storage guard was skipped
  for this local non-release build. Browser checks also passed again with the
  locked dependencies.
- Before and after screenshots and the reproducible fixture are retained with
  the private local verification artifacts.

This is local synthetic UI proof, not authenticated `/admin` staging or
production acceptance. Authenticated hosted preview verification remains required before review
readiness; draft publication awaits permission. No PR,
remote push, merge, deployment, or role mutation was performed.
