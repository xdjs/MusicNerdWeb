# PR #1280 — 9d6be277

Preview: https://music-nerd-g4tt554n7-musicnerd.vercel.app

Live: staging data, public guest flow, four periods at 832px and 390px (2x/touch), both themes. Email fallback names masked for public captures.

Fixtures: browser-intercepted leaderboard and signed-in session responses; two contributors or an empty period. These test rendering and inactive-account summary behavior, not real authentication. The database/query path was verified separately with synthetic local PostgreSQL data as mnweb.

No shared database writes. See PR verification comment for the matrix and limitations.
