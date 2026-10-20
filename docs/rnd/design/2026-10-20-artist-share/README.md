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

## 2026-10-20 — Three composition studies and CTA comparison

Pete requested further design and invitation exploration after the Inter/color preview. The gallery now preserves that exact candidate as a reference and adds three preview-only compositions: text-led editorial (portrait right), portrait-led (full-height image left / text panel right), and compact profile (large name / circular portrait / broad bio). Each has white and #FB57C0 versions. Inter remains; KoHo stays removed. The gallery separately compares the same editorial composition with “Get to know Pete Rango”, “Explore their music”, and “Meet Pete Rango”. “Get to know” is the proposed recommendation, not owner acceptance. Longer or unsupported names use “the artist”; unsupported name text still follows the documented neutral fallback. The music wording means exploring profile links, not an embedded player.

New `layout`/`cta` query options are explicitly enabled only on development/preview deployments. Default profile metadata and the earlier renderer remain the reference. No changes to identity, public-content gates, image eligibility or refresh policy. Owner choice and approval are still required before merge/production.

## 2026-10-20 — Creative direction review and editorial refinement

At 348px rendered card width on a 390px phone viewport, the earlier editorial's 32px bio becomes roughly 9.3px, and its detached 28px CTA becomes 8.1px. Name recognition works; the reason to click is too small despite ample unused space. Portrait-led is emotionally stronger with photography, but sacrifices text width; its absent-bio state is sparse. Compact profile has strong name/pink recognition but resembles a directory entry and makes the artist image secondary. Contrast is already strong; type scale and grouping, not additional decoration, need work. Bottom-right unboxed glasses are a useful quiet signature.

**Recommendation:** refine Editorial, favor logo pink #FB57C0 for brand recognition, and use “Get to know [artist]”. It promises the person, story and context surrounding their music, without suggesting a player. “Explore [artist]” is compact but less specific; “Their music. Their story.” expresses positioning but is less clearly an invitation. These judgments are a proposal, not measured click-through claims or owner approval.

The new `layout=story` study uses an 80px short name, 40px bio (shorter contiguous excerpt, three lines), 36px CTA directly following the excerpt, a 408px square portrait, and the same genuine corner glasses. White is retained as a secondary palette. CTA comparisons show know/explore/story on identical artwork; the story wording falls back to “Get to know” when no eligible bio is available. Earlier layouts and the original reference stay unchanged. No image editing, invented biography or public-content boundary change.

### New art-direction exploration — owner rejected the shared split-card structure

The next comparison changes silhouette, hierarchy and image treatment, not spacing. Same LATASHÁ public profile/image/bio in all three; this profile has an eligible public excerpt and public artist artwork. Pete's current public image is a logo, so he remains a secondary check rather than pretending it is photography.

- Cover: oversized image field, large name over its top edge, white caption band across the foot. Invitation: “Read their story” only when public biography exists.
- Sleeve: giant circular artist-image crop on a pink field, offset white title strip and compact caption below. A record-sleeve graphic language, not a claim that a particular record exists. Invitation: “Explore the artist”.
- Dossier: tilted photographic print over a white page, name spanning the top and a pink biography slip across the lower middle. Invitation: “Get to know [artist]”. No invented metadata, dates, issue numbers or extra photographs.

Inter regular/bold; white #FFFFFF, ink #171717, actual logo pink #FB57C0, separately labeled site token #FF9CE3. Genuine glasses unboxed at bottom right. Each preview receives the same contiguous public excerpt limit; no private data or public-content gate changes. Long-name/public-bio stress examples are explicitly synthetic. Prior gallery retained. Recommendation follows actual render critique; no owner approval implied.

### Three additional concepts requested

Retain all earlier studies and compare three new silhouettes with the same LATASHÁ public content: Spotlight (central arch and flank typography), Sequence (one photograph deliberately repeated across three frames, not three different photos), Broadcast (pink-washed full image, vertical name and angled white biography panel). Inter and the existing pink references remain; public eligibility/cache/default metadata stay unchanged. Each gets the same 100-character public excerpt limit. Visual critique and stress checks precede publication.
