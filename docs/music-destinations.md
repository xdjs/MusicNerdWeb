Route discovered music destinations to the artist’s **Links** section, following Pete’s October 5 request. Current production still misplaces Apple Music/Beatport pages in Lore and can discard catalog URLs supplied by MusicBrainz. Implementation is in progress; no data correction or release has occurred.

> **2026-10-05 — Pete resumed and broadened this work:** “any music links like apple music, beatport, etc should end up in Links not lore.” This supersedes the September 15 implementation pause and pending routine storage/review decision. Artist and release/store destinations use existing reviewable URL sources; genuine articles/interviews remain Lore.

## Goal

Approved music destinations appear in **Links**, with recognisable platform labels; artist profiles can also appear in **Listen**. Album/track URLs remain specific destinations and never become artist IDs. Research retains catalog links from ordinary search, MusicBrainz, artist-owned pages and followed indexes while preserving artist identity, ownership, manual choices, rejection history and attribution.

## PRs (updated 2026-10-05)

| PR | Item | State |
|---|---|---|
| MusicNerdWeb#TBD | Destination contract, existing-source presentation, review controls and regression coverage | In progress on `codex/music-links-not-lore`; no migration |
| MusicNerdAPI#TBD | Retain and correctly classify verified catalog URLs in research | In progress on `codex/music-links-not-lore`; no migration |

> Merge/release Web presentation before API classification. Neither PR is approved for merging or production yet.

## Done

- **Diagnosis and production reproduction (September 15–23).** Apple Music/Beatport lacked a writable direct-link destination. Pete’s Beatport artist profile landed in Lore as Article. Willie Colón’s identifier-matched MusicBrainz catalog links were discarded, and his homepage appeared as Article. [Pete reproduction](https://github.com/xdjs/MusicNerdWeb/issues/1273#issuecomment-5803428793), [MusicBrainz reproduction](https://github.com/xdjs/MusicNerdWeb/issues/1273#issuecomment-5803718646).

## Open — implementation and verification

- [ ] **Render reviewed music destinations in Links.** Strict host/path parsing for supported artist and release URL shapes, including Apple Music, Beatport, Spotify, Deezer, Tidal, Qobuz, Amazon Music and Bandcamp. Existing approved sources route by URL without rewriting historical rows. Pending/rejected records are never made public by presentation. Exclude podcasts, editorial pages, lookalike hosts and malformed URLs. Preserve usable titles for release destinations. Artist/store profiles can join Listen; individual releases do not.
- [ ] **Preserve catalog URLs during research.** Ordinary search, MusicBrainz/own-page links and followed indexes share the same URL classification. Keep existing relevance, namesake, dead-page and ownership checks; preserve original discovery URLs and review/provenance. Existing artist-ID mappings constrain research candidates rather than getting overwritten. Confirm official homepages supplied by MusicBrainz as website destinations. Discogs release/master URLs must never be typed as artist Profile.
- [ ] **Review stays available.** Reuse existing source approvals/rejections and removal tombstones. Show source-backed music destinations in the Links editing flow with their original source records; no second copy or competing catalog identity.
- [ ] **Regression evidence.** Real caller/persistence paths cover profile/release parsing, MusicBrainz and own-page adoption, wrong artist/shared name, failed writes, rejected/deleted candidates, mappings/conflicts and expired ownership. Preview at 832/390 px in both themes with screenshots on exact-head PRs. No paid scraping or production mutations for QA.
- [ ] **Existing-record inventory.** Read-only dry run lists affected source IDs, original URLs, existing approval state and proposed routing/review. Pete’s old 404 Apple URL and three pending sources from the September 23 reproduction require explicit review before any production correction. Never recreate his deleted Beatport record. Do not delete/recreate the Willie Colón production test artist without an explicit reviewed scope.
- [ ] **Release.** Record reviewed PRs, main SHAs, staging verification and protected production promotion separately.

## Architecture decisions

- **Use existing reviewable URL records.** `artist_vault_sources` already stores original URL, approval/rejection, provenance and removal decisions, and official websites already render in Links. Reuse that mechanism for additional music destinations; do not add a column per catalog or overwrite `artist_id_mappings`. This supersedes the earlier proposed mapping-versus-column gate.
- **Destination and evidence are different concerns.** A catalog URL belongs in Links but its retained factual source text can remain available to artist knowledge. Genuine editorial/interview pages stay in Lore. URL shape does not establish artist identity.
- **No broad backfill.** Read-only presentation fixes historical placement for already approved records. Any identity correction, approval/rejection or restoration requires a concrete reviewed inventory.

## Source references

- [Research-flow owner #1265](https://github.com/xdjs/MusicNerdWeb/issues/1265), [research visibility #1347](https://github.com/xdjs/MusicNerdWeb/issues/1347), [release-specific listening #1238](https://github.com/xdjs/MusicNerdWeb/issues/1238).
- Web: `OfficialSiteLinks`, `PressAndFeatures`, `VaultSection`/`VaultManager`, `artistProfileLinks`.
- API: `lib/vault/fileCandidate`, `adoptFromMusicBrainz`, `adoptHandlesFromOwnPage`, `followIndexLinks`, `writeVaultSource`.
- The September reproductions and original discussion remain in the issue’s comments. Historic code locations precede the October API cutover; current research belongs in MusicNerdAPI.
