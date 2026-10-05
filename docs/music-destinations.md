# Music destinations on artist profiles

[#1273](https://github.com/xdjs/MusicNerdWeb/issues/1273) follows Pete’s October 5 decision:
music links belong in Links, while stories, interviews and editorial coverage belong in Lore.

## Data and presentation

Reuse `artist_vault_sources` as the reviewable URL record, as for official websites. Keep
original URLs, provenance/activity, pending/approved/rejected state. Removing a destination through Links records a rejection,
so research does not re-add it. Historic hard-deleted rows have no recoverable tombstone. No new artist column or competing ID mapping is required.

A strict host/path parser identifies artist and release destinations on Apple Music,
Beatport, Spotify, Deezer, Tidal, Qobuz, Amazon Music, Bandcamp, Subvert, Supercollector,
SoundCloud, Audius and Mixcloud. URL shape establishes
the destination, not the artist’s identity. Podcasts, playlists, charts, label pages,
editorial pages, malformed URLs and lookalike hosts are not artist catalog destinations.
Spotify artist/album/track IDs require 22 base62 characters and retain their original case.
Subvert accepts artist roots, `/{artist}/{release}`, `/{artist}/tracks/{track}` and
`/{artist}/releases/{release}`; bare collection tabs are not release destinations.
Provider information, policy and account routes are reserved, including Subvert's
changelog, terms, privacy, AI policy and author archive. The URL parser and handle
adoption share these route exclusions instead of maintaining independent lists.

Only approved records render publicly. Recognized music URLs appear in Links even if
historically typed as Article/Profile; the read does not rewrite records or approve them.
Artist/store profiles can also appear in Listen. Bandcamp, Subvert and Supercollector
appear in Support the artist within Links. A source-backed-only section has no empty-state message. Album/track URLs keep their descriptive
source titles in Links and never become artist IDs or the artist-level Listen target.
Accepted HTTP and HTTPS destinations remain visible; their original saved URLs are preserved.
Editorial pages remain Lore. SoundCloud, Audius and Mixcloud release URLs stay audio/Lore unless explicitly classified
Music: their URL shapes also represent spoken shows. A URL alone never supplies that
classification. Their artist profiles still route to Links unless explicitly typed Audio or
Interview; that classification is preserved by both the source writer and public placement.
Podcast metadata also retains Lore. Existing direct artist links remain unchanged.
YouTube videos are not automatically classified as music. The Links editing surface reuses source review/removal controls. Editors remount when the
filtered source identity/type changes, so a correction moves between Links and Lore immediately.
The original source remains available to knowledge retrieval with its real URL and text.

## Research

MusicNerdAPI owns research. Ordinary search, MusicBrainz/own-page adoption and index-follow
candidates use the same destination shapes. Successful research keeps catalog URLs as
reviewable sources instead of discarding them for lacking an artist column. Catalog
sources use the `music` source type; source approval rules and attribution still apply.
Existing artist-ID mappings and manual/approved destinations constrain new research rather
than being overwritten. Public Links/Listen also suppress source-backed artist profiles that
conflict with a stored mapping, a canonical artist platform column (including another artist’s identity),
or a platform exclusion. Handle comparisons preserve legacy leading-@, case and whitespace
normalization (and Supercollector’s supported `.eth` suffix); Spotify IDs stay case-sensitive.
A failed identity read hides source artist profiles; editors retain the records with a review notice. Rejected URLs remain rejected; ownership is rechecked under the
existing artist write lock. The MusicBrainz homepage is an untrusted discovery candidate even
when MusicBrainz matched a known identifier. It enters the existing fetched-page relevance
batch and becomes a website destination only when readable content is affirmed as about the
artist. An unreadable or unconfirmed homepage cannot supply source text or outbound identity
links. This does not add another model request. Discogs release/master pages are not typed as artist Profile.
Known artist profiles do not suppress new release URLs on the same account. Artist-scoped
release URLs can still corroborate the account handle present in their path or host; opaque
album/track IDs never become artist IDs. That corroboration requires an already-known canonical
account: a release's uploader or label/store cannot establish a new artist account. Catalog fetches and identity checks recheck the
run deadline before subsequent source or account writes.
Each MusicBrainz catalog relation must independently match the full artist name in its page title and
clear name ambiguity, even when another relation matched a trusted identifier. Duplicate
and saved destinations cannot consume the nine-fetch cap before a new destination is tried.
Source rows are reviewable evidence, not cross-artist identity reservations. Research
checks current canonical owners before saving; a later canonical change is enforced again
by the public Links/Listen read. Pending evidence on another artist does not claim ownership.

Research still has bounded fetch/judge/write phases and uses existing jobs. Artist page
reads introduce no research, model calls or writes. No new paid scrape is required.

## Verification and rollout

Parser regressions cover host spoofing, country/slug variants (including language-region Deezer paths), profiles versus releases,
podcasts, malformed IDs and invalid schemes. Caller/persistence tests cover identity,
manual choices, rejected URLs, duplicate candidates, failures and ownership revocation.
Preview checks target Links/Lore/Listen plus editing at 832 and 390 px in both themes;
the PR records which authenticated actions were exercised.

Migration `0036_music_destination_owner_indexes` adds six non-unique expression indexes
matching the normalized Bandcamp, Subvert, Supercollector, SoundCloud, Audius and Mixcloud
ownership comparisons. Existing raw Spotify/Deezer and mapping indexes cover the other
identity checks; existing social lookup indexes remain unchanged. Apply and verify the
migration on staging and production before either dependent Web or API release. The migration
changes no artist records, grants or RLS policies. An app-role query-plan regression exercises
the actual public read on a 42,000-artist local PostgreSQL fixture and rejects sequential
artist scans. Run the environment's migration protocol; local evidence does not establish
that a live database has the indexes.

Web presentation ships before API classification. Main merge, staging verification and
production release are recorded separately on #1273. A read-only inventory precedes any
historic identity correction or approval. No production record is changed by this feature.

## Onboarding integration

[#1429](https://github.com/xdjs/MusicNerdWeb/pull/1429) adds a no-support-links wizard prompt.
It is stacked after this Web change and includes approved source-backed support destinations in
both real and preview `ProfileTour.hasSupportLinks` conditions using
`getSourceLinks(approvedSources.filter(source => !blockedMusicSourceIds.includes(source.id)), [], 'support').length > 0`
alongside `getProfileLinks`. The same identity-filtered sources feed public Links and Listen.
Do not duplicate platform URL parsing at the page call site. Merge Web #1430 first, then
retarget #1429 to main after the squash merge, verify its diff/checks and merge it. Release
API #21 only after Web presentation. Merge and production approval remain separate gates.

## Verified URL examples

- [Subvert artist](https://www.subvert.fm/pete-rango),
  [track](https://www.subvert.fm/pete-rango/tracks/rush),
  [album](https://www.subvert.fm/megadepth/the-embryology-of-human-institutions).
- [Supercollector artist](https://release.supercollector.xyz/artist/joey-collins),
  [release](https://release.supercollector.xyz/yin-yang-joey-collins).
- [Audius artist](https://audius.co/Dutchyyy),
  [track](https://audius.co/Dutchyyy/trend-to-zero).
- Excluded information routes: [Subvert changelog](https://subvert.fm/changelog/),
  [AI policy](https://subvert.fm/ai-policy/), [SoundCloud terms](https://soundcloud.com/terms-of-use),
  [Audius legal documents](https://audius.co/documents/TermsOfUse.pdf),
  [Mixcloud plans](https://www.mixcloud.com/plans/).

Subvert collection/user (`/@…`) pages and discovery/docs/blog pages are not music artist
profiles. Provider roots, category pages and playlists do not become artist IDs; SoundCloud
sets can remain specific listening destinations, never artist-level Listen targets.

### Provider route inventory (2026-10-05)

The checked URL fixture is `src/lib/musicLinks/__tests__/fixtures/providerInformationUrls.json`.
It exercises both parsing and public source placement; these URLs cannot become Links,
Support or artist-level Listen destinations. The inventory covers known routes, not a guarantee
about future provider routes. Root namespaces apply only on the relevant service; an artist's
release slug such as `/pete-rango/changelog` remains a release.

| Service | Primary evidence used for reserved routes |
|---|---|
| SoundCloud | [Company/footer navigation](https://soundcloud.com/company/newsroom), [imprint](https://soundcloud.com/imprint), [legal links](https://soundcloud.com/terms-of-use), [upload/navigation shell](https://soundcloud.com/n/upload): company, product, policy, discovery and account namespaces |
| Mixcloud | [Jobs page navigation/footer](https://www.mixcloud.com/jobs/): blog, community, genres, live, subscription plans, legal/account and developer routes |
| Audius | [Official route table](https://github.com/AudiusProject/audius-protocol/blob/2633593d2ff1d6e627ec139304bf835a4e916dbe/packages/common/src/utils/route.ts): all static/auth/legal/navigation roots; `/:handle` routes remain supported, including the real `/audius` account |
| Supercollector | [Release site navigation](https://release.supercollector.xyz/): `/artists` directory and `/create` workflow, alongside existing info/account exclusions |
| Bandcamp | [Homepage/footer](https://bandcamp.com/) and existing research reserved-subdomain rule: official `store`/`support` and editorial/help hosts; root `bandcamp.com` never represents an artist |
| Subvert | [Changelog and policy links](https://subvert.fm/changelog/), [documentation](https://subvert.fm/docs/), [author archive](https://subvert.fm/author/subvert/), plus existing discovery/account routes. Direct retrieval was blocked; this part used indexed official pages. |
