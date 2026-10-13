# About and profile API prototype

Review-only design for #1463 and #1455, requested by Pete before the next morning call. No production release or credential changes.

## Basis
- October 7 standup, 06:42–09:00: API discoverability from menu/footer; Pete proposed an API tab in the user profile and surfacing the existing token there. Carl proposed About as a hub. [Transcript](../../transcripts/2026-10-07-standup-aeebf1c29ed0.md).
- October 8 R&D, 12:42 and 19:55: Pete owns About; Sweetman owns footer. [Transcript](../../transcripts/2026-10-08-rnd-cefde15adfb0.md).
- #1437 already delivered /access. This exploration changes discoverability, not API permissions or database credentials.

## Review
- /about: concise product explanation, project links and API entry. Existing site navigation, font, theme and footer. About added to menu/footer in this prototype branch.
- /preview/about-api: existing ProfileConcept presentation with Overview/API tabs; public sample account. No sign-in needed. Preview/development only, noindex.
- /preview/about-api?tab=api opens API directly.
- Get access token, Copy token and Refresh token operate only on clearly nonfunctional sample strings. Refreshing the page resets them. No token fetching, database connection, paid research, permissions, persistence or production changes.
- API credentials belong to the signed-in user account, never a public artist page. A later approved integration would reuse the existing token hook and permissions, not invent long-lived keys.
- No request-usage charts or billing numbers are invented. This is how to use/connect to the API.

## Design
Use existing Music Nerd typography and themes: dark #191919, light #fafafa, black/white text, muted existing tokens and pink #ff75d8. Left-aligned About with one large headline, three plain explanatory columns and one API callout. The profile keeps its existing header; API sits alongside Overview. Existing tabs provide keyboard navigation. The token section explains purpose, lifetime, copying and documentation.

## Pending decision
Review About copy and choose profile-tab placement versus a simple link to /access. No functional authentication change is ready for release from this prototype. Keep this branch isolated until reviewed.
