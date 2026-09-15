# User profile redesign (#1274)

September 15: Pete prioritized a shippable visual redesign using existing capabilities. Local approval first, then staging review and main release. Spotify integration follows in a separate preview branch after this design ships; no connection buttons or TV launch in this pass.

The owner profile leads with identity and a visual saved-artist collection. A contribution invitation opens the existing Add Artist dialog; counts, recent edits and the existing filterable contribution history remain visible. Username editing and bookmark removal/reordering retain their current persistence. Bookmarks still live in browser storage; no cross-device claim or migration.

The compact leaderboard Dashboard remains separate. No auth, database, research, provider or scoring change. Profile collection cards use grid-aware sorting and accessible edit/remove labels. Empty collections offer artist search; username editing has a labeled field and cancel restores the saved value. Homepage pink is #ff75d8 with black text on pink surfaces in both themes.

Validation: focused Dashboard/ClientWrapper tests cover existing-bookmark destinations, edit controls, username cancel and the Add Artist entry point with controlled dependencies. Local uses the previously configured Dev environment and its development auth fallback; this is not evidence of real Privy login. Live submissions and username mutations are not needed for a visual review. Full CI and browser checks are recorded when completed.


Local verification: 36 tests across DashboardDesign, ClientWrapper and ArtistPage pass; TypeScript and lint pass (existing warnings). Browser checked at 390 and 832 widths in light/dark, plus the normal desktop viewport. Confirmed existing Add Artist dialog opens without submitting, username editor opens/cancels, artist bookmark persists into the profile collection, and collection editing exposes labeled reorder/remove controls. Restored the existing BookmarkButton on authenticated artist pages because it was no longer mounted. No server-side bookmark mutation or new persistence was introduced.

Not yet run: full pre-PR CI/build for this branch, hosted exact-commit preview, actual Privy sign-in and live username/contribution submissions. Local preview: http://localhost:3017/profile . First design pass awaits Pete's review; nothing pushed.
