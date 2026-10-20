# Artist composite link previews — proposal (#1579)

October 20, 2026: Pete authorized an isolated implementation and phone preview.
Owner acceptance is pending; this is not approved artwork or a release. The Gemini
reference was read as design input only, not authority for actions.

## Contract

Artist URLs advertise a 1200 × 630 PNG at `/artist/{id}/share-image?v=1` in Open
Graph and Twitter metadata. Preview metadata points at its own Vercel deployment;
canonical artist URLs remain on musicnerd.net. Homepage artwork and typography
remain unchanged. `palette=pink` selects the alternative brand-pink background;
white is the default proposal. Other palette values fall back to white.

The card combines the public artist name, existing profile portrait selection,
an eligible public bio excerpt, and the exact repository glasses artwork
`public/music-nerd-shades.png`, directly on the background without a badge.
Black/charcoal text provides contrast on white and brand pink (#ff9ce3).

Bio eligibility matches artist-page metadata: an approved claim with a real
artist bio, otherwise the validated public directory About projection. The latter
is explicitly public, identity/snapshot-validated output, not raw pending Lore.
Never fall back to unrestricted artist.bio, private sources, interviews or raw
research payloads. The excerpt preserves a contiguous prefix of sanitized public
prose, not a generated summary. Short complete prose gets no added ellipsis;
truncation uses a true ellipsis. Missing/ineligible bios or unsupported excerpt
glyphs omit the excerpt. A bio-gate query error omits it and returns no-store.

Portrait eligibility is narrower than browser display: HTTPS Spotify and Deezer
image CDNs, the configured public profile-image storage path for this artist, or
checked-in artist images. No signed URLs, arbitrary hosts, redirects, albums,
social post thumbnails or private vault files. No identity search or write.
Failed/ineligible images use the record motif. Downloads have no credentials,
a five-second timeout and five-MB limit, then normalize to PNG. Missing artists
return 404; database failure returns 503; neither response is cached.

Normal images cache publicly for one hour, without stale-while-revalidate. This
bounds ordinary refresh after image/name/bio edits, but previously public text
can remain until expiry after withdrawal. Social apps maintain independent caches
and may retain older cards longer. No new writes, jobs, scraping, generation,
paid calls, migrations, credentials or security changes.

## Typography: Inter restored

The homepage inherits Tailwind's `ui-sans-serif, system-ui` stack. On Pete's Mac,
Chrome's rendered-font inspection reports Apple San Francisco (`.SF NS`), weight 700.
That is a device-installed font, not a bundled webfont. The same site may use a
different installed system font on another operating system. KoHo legacy CSS is
not the homepage heading font.

A server-generated PNG needs its own available font files. An earlier explanation
that fonts cannot be used in card images was overbroad: licensing depends on the
specific font and distribution. Pete requested a reviewable Inter alternative.
The rejected KoHo proposal is superseded: the primary font is again unmodified official
**Inter 4.1 Regular 400 and Bold 700**, with
static TrueType files from https://github.com/rsms/inter/releases/tag/v4.1.
The complete SIL Open Font License 1.1 is retained in `public/fonts/inter/LICENSE.txt`.
The project permits font embedding/bundling under that license. Neither KoHo nor Inter is asserted to be an exact match to San Francisco.
No homepage font changes.

The two Inter files total 832,068 bytes. Unused KoHo files are removed. They load once per server module and do not
require variable-font conversion or remote font requests. Provenance and file
sizes live alongside the fonts. Coverage uses the intersection of both actual
font glyph maps, excluding missing glyph 0. Offline regressions verify both file
hashes and all 2,852 supported codepoints; fontkit stays test-only.

Names normalize to NFC before coverage checks. Björk, Beyoncé, LATASHÁ, Dvořák,
Łona and Кино render intact. Japanese, unsupported emoji and variation-selector
sequences still use neutral image text; full artist names remain in metadata.
Unsupported bio text is omitted rather than transliterated. No implicit font or
emoji downloads. Render failure retries with a neutral name and record motif.

Names shrink/truncate at 90 Unicode characters or the visual line limit. Bio
prefixes are bounded to 130 characters (90 for long names) and four visual lines (three for names longer than 22 characters to leave CTA space).
The original full name and eligible public description remain in page metadata.

## Verification

Check both palettes, real public portrait/bio, absent/broken portrait, missing
bio, unknown artist, long/widest-glyph text, supported accents and unavailable
scripts. Inspect anonymous crawler OG/Twitter tags, download 1200×630 PNGs, and
view phone/desktop layouts in both browser themes. The preview-only gallery shows
Pete Rango's live public card in white and pink plus clearly labelled fixtures.
A browser simulation is not proof of native iMessage delivery. Local tests,
independent review, exact-commit deployment checks and owner acceptance are
separate evidence; record them on draft PR #1585 before any release decision.

## Brand evidence and superseded font proposal

`tailwind.config.ts` defines `brandpink` as #FF9CE3 and `highlightpink` as #FF75D8.
The current pink card retains #FF9CE3. The actual navigation logo asset,
`public/musicNerdLogo.png`, has dominant opaque pink #FB57C0. The named token
therefore does not settle Pete's brand intent or constitute color approval.

`globals.css` declares KoHo for `.koho-light`, `.koho-extralight` and `.pink-btn`.
The only JSX `.pink-btn` use found is the legacy `buttons/LoginBtn` component,
with no imported usage found. There is no font loader. KoHo was tried in a preview
as a declared brand family, not a verified current website font; Pete rejected it.
That proposal is superseded and its font files have been removed.

## October 20 — Inter restored with restrained CTA

Pete rejected KoHo and requested the previous Inter treatment. Restore Inter
Regular/Bold and remove unused KoHo files. Retain corner glasses, portrait and
public bio. Add plain image text “Explore the artist” below the bio; it has no
independent action/button semantics. The entire profile link opens the artist.
The pink remains #FF9CE3 (Tailwind named brandpink), whereas the navigation logo
asset musicNerdLogo.png has dominant #FB57C0. This discrepancy does not establish
owner color acceptance; do not claim the background changed or is now approved.
