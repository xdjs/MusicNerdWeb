# Homepage reference exploration

Local implementation on `pete/homepage-design-system`, updated with staging
`828830b852fcf519f1a0819d9ba50c092cbb5d18`. Not released.

Pete supplied a mobile homepage reference and the circular pink Music Nerd logo
on September 11. This iteration uses its flat pale background, lettered logo centered above the manifesto on all screen sizes,
stacked pink/purple typography and search below the text, with the existing
homepage manifesto and invitation. No new promotional copy is included.

The current supplied lettered PNG is `public/music-nerd-logo-pink.png`; Next Image serves
responsive optimized sizes. The homepage nav retains the login/menu control. Search and the add-artist
plus button sit together in the homepage body. Other routes retain their existing
navigation, including staging’s sticky artist navigation. The account dropdown
preserves PR #1234’s frosted charcoal panel, Explore/Account groups, icons and
48px rows in both themes. The homepage reuses the real SearchBar and ActivityFeed; the static
shell stays a Server Component and search has a Suspense boundary. The existing
four-row activity feed remains below search. Homepage styles are scoped to this
route, including a compact footer, light/dark colors and reduced motion. The
refinement pass reduces manifesto size and vertical gaps, enlarges search to
56px, keeps feed rows/timestamps fully visible, and uses an account icon for the
homepage signed-out trigger. A second visual pass adds space between manifesto
statements, outlined secondary controls, a subtle feed divider
and a steady activity indicator. On mobile the footer follows the content without
stretching the main region. The separate pink text wordmark is removed; the
logo is the page heading with an accessible image name. Authentication behavior is unchanged.

No API, persistence, job or integration behavior changes. No migrations or new
dependencies are required.

## Local review

Worktree: `/private/tmp/musicnerd-homepage-design-system`.
Preview: `http://127.0.0.1:3020`.

Use the development configuration in ignored `.env.local`. To restart:

```sh
NEXTAUTH_URL=http://localhost:3020 npx next dev --hostname 127.0.0.1 --port 3020
```

## Verification — September 11, 2026

- Homepage, activity, search/add, theme and login suites: 6 suites / 66 tests passed.
- TypeScript and full lint passed (existing repository warnings).
- Browser: the supplied logo, current manifesto, real activity feed and relocated
  search render; SENTO search returned existing directory results on mobile.
- Integrated menu verified at 1440px and 390px: glass styling, grouped items,
  48px rows, viewport fit, opening and working theme toggle.
- Full `npm run ci` passed after syncing staging: TypeScript, lint (existing
  warnings), 202 suites / 2,387 tests passed / 6 skipped, and production build.
- Real login and add-artist writes were not exercised. Pete authorized a Vercel
  team preview; no staging PR or production release is requested.
- The existing optional Privy `@farcaster/mini-app-solana` build warning remains.
