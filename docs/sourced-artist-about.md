# Sourced artist About and suggested corrections (#1558)

Pete approved this direction after the October 16 standup and selected option A
on October 17: “Suggest a correction” beside “Read more” on the real portrait hero.
This supersedes the blanket pre-claim About prohibition in #1371 for the narrowly
eligible public projection described below. Private Lore, interviews, raw originals,
source review states and preparation documents remain private.

## Display and evidence

An artist's existing claimed, published About remains authoritative. Preparation
must never overwrite artist edits or pinned bios. Before claim, a separately
prepared About may be shown only while its identity-assessed public source
snapshots remain current, unrejected and associated with the original directory
creation. A legacy bio, source snippet or old private draft is not automatically
eligible. Beginning a claim withdraws the directory projection; the existing
claimant publication flow remains authoritative.

Prefer an exact labeled biography passage from a matched artist-owned platform
profile, with the original source link. Custom-domain website ownership is not
currently persisted, so website material uses the researched fallback; a name-based
domain match never earns an official attribution. Ownership must use existing verified artist destinations,
not a same-name domain or a third-party article that links an artist account.
Do not assume Spotify's metadata API provides biographies. If no usable official
passage exists, use the existing bounded generation path with identity-assessed
originals and validated citations. Label that result as researched, with source
links retained from both the underlying research and final About. Summarization
must not lose the attribution of facts inherited from that research. Insufficient or ambiguous evidence produces no invented biography.

Public reads are read-only and revalidate eligibility. Return only the selected
About, its provenance kind and safe citation labels/URLs, never the private
preparation document, raw source text or source-review payload. The public profile,
bio endpoint and metadata must agree. Existing other public evidence interfaces
must not accidentally gain access to private Lore through this change.

On preview review, Pete asked for a quieter collapsed hero: attribution is now
inside the existing Read more expansion. Expanding reveals the source heading and
links directly, without a second Sources dropdown. A short sourced bio also has
Read more so its attribution remains available; its text is not truncated.
Suggest a correction stays beside Read more/Show less in both states.

## Suggest a correction

Show a quiet text action beside Read more/Show less, including a standalone action
for short bios. Keep the action available without entering artist edit mode.
Use the existing dialog and authentication conventions. Signed-in listeners can
choose wrong artist, incorrect fact, outdated information or other, with bounded
optional details and an optional public HTTP(S) source link. An anonymous visitor
can inspect the form and is asked to sign in before submitting.

Store a private review item with the authenticated submitter, artist, reason,
details, source URL and the exact public bio being reported. Duplicate submissions
must not create repeated pending reports; bound submission frequency. Do not fetch
submitted URLs or interpret report text as model instructions. Reports never write
artist bios, approve sources or influence generation automatically.

Admins review reports in the existing admin workspace’s **About corrections**
sidebar tab, with a pending count (and the same section in the mobile picker), visit the artist's existing
editor to make a correction, and mark reports resolved or dismissed. Review is
admin-authorized server-side; public users cannot list reports or change their
status. Preserve the original report and reviewer attribution. Do not say a bio
was corrected merely because a report was resolved.

## Verification

- Real profiles: Dutchyyy (existing artist bio), Xcelencia (namesake regression),
  a distinct Jamie Duffy identity, and an artist with sparse public sources.
- Official exact passage versus generated fallback, correct source attribution,
  no evidence, and wrong-artist evidence rejected.
- Unclaimed, pending/approved/revoked claims; edits/pins preserved; source changes,
  rejection, deletion and invalid assessments withdraw prepared public output.
- Suggestion success, validation, duplicate/rate limits, signed-out submission,
  unauthorized listing/review and stale bio snapshots.
- Actual hero placement and dialog at 832 and 390 pixels in both themes; no source
  text leakage, no profile-read research writes, and no automatic bio mutation.

Use isolated staging data and existing durable jobs for integration checks. Record
paid provider/model work and remaining limitations. No bulk production backfill or
production reset is part of this change. Open draft PRs; merging and production
release require separate authorization.

## Delivery and migration order

Web migrations `0053_artist_bio_corrections.sql` and
`0054_public_directory_about.sql` must be applied and checked as `mnweb` before
the dependent Web/API releases. Existing preparations receive NULL public output;
there is no backfill. Apply SQL and track Drizzle snapshots/journal together.
The API worker adds a versioned public projection only during a normal durable
preparation job. Profile reads never generate or refresh it. Production migration,
main merges and promotion are separate gates.

October 17 admin review feedback: Pete rejected duplicate review links above the
dashboard. About corrections belongs alongside Link submissions and Lore review,
with reports in the main panel. `/admin?section=corrections` opens that panel; the
earlier `/admin/bio-corrections` address redirects there. Both header shortcuts
are removed; existing contribution-review routes remain accessible by direct link.

### October 17 review refinements

Correction reporting is for visitors who cannot edit the current profile. Admins and authorized artist editors use the existing editing controls; the report affordance is hidden using the existing per-profile `canEdit` permission. Whitelist status alone does not suppress visitor feedback.

Admin filters and the correction reason menu share `MusicNerdSelect`, using the rounded, theme-aware menu treatment from interviewer draft #1562 (tracked in #1564). Form filter values, empty “All” choices, sorting and keyboard selection remain unchanged. The interviewer branch is not modified.
