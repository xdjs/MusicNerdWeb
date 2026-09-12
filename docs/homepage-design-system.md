# Homepage design system preview

Local implementation on `pete/homepage-design-system`, based on staging
`424cfbf07d0c7e24c21f870e47a1cc1fa2f98c0d`. Not released.

This applies the system extracted in `.design-sync/conventions.md` and `DESIGN.md`
to the existing homepage manifesto. It is an interpretation of that system, not
an exact reproduction of a separate Carl mockup: no homepage export exists in
`.design-sync`, and its linked Claude Design project was inaccessible.

The composition uses the existing system font, identity-pink wordmark, an 800px
column, shared glass/glass-subtle surfaces and pink/cyan backdrop. Existing
manifesto wording, nav search, add-artist/login controls and activity polling remain.
The light theme uses dark ink for readable manifesto and artist text; the dark
theme uses identity pink accents. Homepage-specific CSS provides keyboard focus
and respects reduced motion. The static shell is a Server Component; ActivityFeed
remains the existing client component. No API, persistence, job or integration
behavior changes, and no migrations or new dependencies are required.

## Local review

Worktree: `/private/tmp/musicnerd-homepage-design-system`.
Preview: `http://127.0.0.1:3020`.

Use the existing development configuration in ignored `.env.local`. To restart:

```sh
NEXTAUTH_URL=http://localhost:3020 npx next dev --hostname 127.0.0.1 --port 3020
```

## Verification — September 11, 2026

- Homepage composition and existing activity tests: 2 suites / 11 tests passed.
- TypeScript and lint for the changed TSX files passed.
- Browser: real development feed rendered four artist links; search for SENTO
  returned existing directory results. Activity initial and polling requests were 200.
- Light/dark desktop and mobile layout reviewed; no horizontal page overflow at
  390px and 320px. Keyboard focus has a visible 2px outline. The live indicator
  animation is disabled with reduced motion. No browser errors or error overlay.
- Existing optional Privy `@farcaster/mini-app-solana` build warning remains.
- Real login, add-artist writes and production were not exercised. Full release CI
  has not been run; run `npm run ci` before opening a code PR.
