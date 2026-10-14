# Private profile API access — PR1511

Verified 2026-10-14 on clean commit `6a9f72a9eabd7c04e09c7502935f7448b9f1b731`.

- Exact preview: https://app-fei3311x9-musicnerd.vercel.app/profile
- Stable alias: https://app-git-codex-profile-api-access-musicnerd.vercel.app/profile
- Preview uses the same staging database through a deployment-only transaction endpoint override; shared environment and production configuration are unchanged. See MusicNerdWeb#1261 for the session-pool failure that prompted this isolation.
- Profile captures: 832×1000 desktop and 390×844 phone at 2× with touch, light and dark.
- API access link is 44px high. Pointer click and keyboard Enter both opened the existing `/access` page. A separate capture shows keyboard focus.
- Account email is hidden in captures. Token text is visually replaced with “Access token hidden for review” in access-page captures. These temporary browser-only privacy masks are not application changes and were removed after verification.
- Copy token and Refresh token were not activated. No token value is included in these captures.
- Authenticated profile summary, artists, and updates requests returned 200 after a fresh reload. The existing staging updates aggregate shows partial data, with two artist-image 404s; this is distinct from the changed navigation.
