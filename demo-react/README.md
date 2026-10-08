# Isolated real-component profile rehearsal

Imports current source ArtistProfileContent, HeroSection, EditModeProvider/Toggle,
ArtistAskSheet/AskAboutArtist, VaultSection/VaultManager, ArtistInterviews,
InterviewResponseCard, and their real Radix controls unchanged. Actual Tailwind
and CSS modules are built. It is not a screenshot tour or rewritten profile DOM.

Two async server wrappers are resolved against public fixtures in browser adapters:
LatestSection renders the real LatestCards/LatestRefreshControl; ArtistLinksGrid
uses the same source transformation and renders the real SortableArtistLinks.
Next image/navigation and auth are browser-only shims. Server actions and fetch
are isolated adapters with no backend access. Unknown operations fail explicitly.

Fresh public LATASHA fixture: 13 approved sources, 12 Latest items (9 Instagram,
3 releases), public platform links, and cached profile/post images. Interview
answer and discovery fixtures are explicitly synthetic, never artist knowledge.

Profile build autoplays; Next points to actual controls, especially the reachable
Edit profile button without clicking it away. The Ask helper types into and submits
the actual chat form. Response revisions/history, source reads, discovery review,
and answer reopening operate locally. Refresh/Replay clears demo state and the
preview origin's research-reopen keys. New interviewer remains off.

Run `node demo-react/build.cjs` with the repository dependencies installed, then
compile globals with Tailwind CLI into static/style.css. The HTML template is
`demo-react/index.html`. Copy demo-assets and siteIcons to the static root. Deploy
`.vercel/output` with `{ "version": 3 }` as a preview only. Stable demo alias:
https://musicnerd-guided-demo.vercel.app . Never promote to production or main.
