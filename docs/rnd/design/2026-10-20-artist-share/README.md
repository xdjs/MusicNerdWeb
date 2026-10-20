# Composite artist share proposal

October 20, 2026 — proposed under #1579; owner approval pending.

Large public portrait (or pink record motif), artist name, Music Nerd, and the existing
“The music is only half the story.” copy. Contract: [artist-share-preview](../../../artist-share-preview.md).
The preview-only gallery at `/dev/artist-share-preview` includes normal/logo, missing,
long-name and unsupported-glyph examples. Full names remain in page metadata.

Independent code review found dynamic emoji/font requests could break rendering;
network-independent neutral text and a render retry resolved it. Independent design
review found the proposal readable, with smaller long-name text at message-bubble
width and a need to review real portrait crops. Square crops and native iMessage
layout remain an acceptance check. This is not owner approval.

Existing saved images with another artist UUID in their object filename are omitted
by the conservative eligibility rule (observed for the copied Dutchyyy staging image).
Owner review should consider that tradeoff alongside the unsupported-glyph fallback.
Screenshots and exact-commit verification belong on the draft PR, not this branch.

October 20 revision: the blanket ASCII restriction was too broad. Preserve supported
accented names through NFC normalization and the existing bundled font's exact
coverage. Composition and font are unchanged; no new font assets or packages.
The revised gallery adds Björk and Beyoncé; Japanese remains an explicit unsupported
case. This correction does not imply owner acceptance.

Owner feedback revision: include eligible public bio excerpts, retain the portrait panel,
and replace the improvised brand heading with the exact repository glasses asset.
No invented missing biography; unsupported excerpt glyphs omit the excerpt.
The existing site uses a system sans stack; no new font packages are introduced.
Revised preview and owner acceptance remain separate gates.

## Inter / background revision

Pete requested a reviewable Inter alternative after the system-font distinction
was clarified. White and brand-pink cards now use the exact transparent glasses
asset directly on their background, without a badge. Static official Inter 4.1
Regular/Bold files and the complete OFL license are bundled locally. The homepage
continues using its device-installed system font. Earlier Noto/no-added-font
notes above describe superseded revisions. Owner approval remains pending.

### October 20 — KoHo and corner logo revision

Owner requested exact brand pink, bottom-right glasses and no domain label. Use
`brandpink` #ff9ce3 from Tailwind. Preview KoHo, the declared intended brand font
in globals.css, loaded locally under OFL with Inter glyph fallback. Supersedes
the Inter-only composition; owner acceptance remains pending.

### October 20 — Pete rejects KoHo; restore Inter, add CTA

Restore prior Inter, retain corner logo and no domain. Plain text “Explore the
artist” sits below the bio; it is not an independently clickable button. KoHo
assets are removed. Pink is unchanged #FF9CE3 (named token); the navigation logo
asset is predominantly #FB57C0. Color intent remains unresolved by that token.

### October 20 — compare logo and token pink

Present #FB57C0 from the navigation logo alongside named token #FF9CE3. Recommend
logo pink as the likely intended match without claiming Pete selected either hex.
Both use restored Inter, plain CTA, public portrait/bio and bottom-right glasses.
