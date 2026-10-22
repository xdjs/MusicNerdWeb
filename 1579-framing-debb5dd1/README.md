# Wider artist portrait framing — 2026-10-22

PR: https://github.com/xdjs/MusicNerdWeb/pull/1598
Source: debb5dd1b77d310448246e3fd9e822c379a314ef

The local images use the actual selected renderer from this commit and its existing
portrait normalization, with public source portraits downloaded for the review.
The before images are the prior released cards. Desktop (832 px) and phone (390 px)
comparison captures were saved before the branch push. These are local visual
checks, not evidence that the change is deployed to production.

Rae Isla: https://musicnerd.net/artist/b494e694-c96c-40c4-bab9-80a29ed55ef0
Sound of Fractures: https://musicnerd.net/artist/b75dc79f-9e5c-4155-a4c5-ce07010e4b33

Both faces and hats fit in the wider composition. LATASHÁ is also shown to record
the wider treatment of full-body photography. The complete-glasses fallback uses
unchanged markup. No face detection, new dependencies or artist-specific settings.

## Exact-commit preview

https://app-ojdpd69kn-musicnerd.vercel.app — dpl_8TrpzSFRoihoGZHWSgJhnQsLtBae,
Ready, source SHA verified through Vercel metadata. Staging database.

The four `*-preview.png` images are unmodified HTTP response bodies from the deployed
routes, all HTTP 200 / image/png / 1200 × 630 with one-hour caching. Rae Isla and
Sound of Fractures use their staging IDs, respectively 5d76d498-76f1-4271-a54f-6912b93f174e
and e3eaace6-73f5-452b-86e6-a14542081a30. Both portraits fit the approved wider composition.
The fallback is the explicit missing-photo preview fixture.

The deployed gallery was checked at 832 and 390 px in light/dark, with all six selected
photo/name/fallback images loaded and no horizontal overflow. Browser captures of
the individual reported portraits use the default browser viewport. Mobile dimensions
are viewport-only: touch/device-scale emulation was not provided by the browser tool.

The existing staging session-pool limit (#1261) was observed in search and artist-page
metadata requests. The final image routes and gallery succeeded. No database settings
or production data were changed. Native messaging-app caching remains unverified.
