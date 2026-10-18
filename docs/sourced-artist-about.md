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

Admins review reports under **Lore review → About corrections**, alongside the
Links and Lore sources filters. The sidebar shows the combined pending count;
the review-type filter shows each queue’s count. Admins visit the artist's existing
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
dashboard, then consolidated the three content queues under Lore review (see the
decision below). `/admin?section=lore&reviewType=corrections` opens correction
reports; `/admin/bio-corrections` redirects there, and the legacy
`section=corrections` query still selects that filter. Both header shortcuts are
removed; existing contribution-review routes remain accessible by direct link.

### October 17 review refinements

Correction reporting is for visitors who cannot edit the current profile. Admins and authorized artist editors use the existing editing controls; the report affordance is hidden using the existing per-profile `canEdit` permission. Whitelist status alone does not suppress visitor feedback.

Admin filters and the correction reason menu share `MusicNerdSelect`, using the rounded, theme-aware menu treatment from interviewer draft #1562 (tracked in #1564). Form filter values, empty “All” choices, sorting and keyboard selection remain unchanged. The interviewer branch is not modified.

### October 17 consolidated review navigation — supersedes separate tabs

Pete chose **Lore review** as the single admin destination for submitted links, Lore sources and About corrections. A **Review type** filter offers All, Links, Lore sources and About corrections, each with its pending count. This initially grouped the existing panels; the unified-list decision below supersedes that presentation. The sidebar count is the sum of all three pending queues. Artist claims remains separate. Legacy link/correction entry points select the corresponding filter within Lore review. This replaces the separate Link submissions and About corrections sidebar entries.

### October 17 unified list — supersedes stacked review panels

Pete rejected stacking the previous queue screens under All. Lore review now uses one paginated, newest-first list across links, sources and corrections, with one search field and one type filter. Every row shows artist, type, a short preview and date; selecting it opens a consistent detail dialog with the existing type-specific actions. Pagination/search apply across the union, not independently to three sections. Private correction text remains admin-only. No new approval rules or database writes are introduced by viewing the list.

### October 17 — inline review and selection

Pete rejected the dialog-first review workflow. The unified list now shows original URLs,
contributors, dates, report text and reported About inline, with per-row actions and checkboxes.
Select this page selects up to 25 visible items; selecting individual rows chooses any subset.
Bulk approval targets links and sources only, rejection targets sources, and resolve/dismiss
targets correction reports. Failed items stay visible and selected with an error for retry.
Full About text expands inline. Normal review does not require opening a dialog.

### October 17 — authentication handoff and visual alignment

Correction drafts persist in session storage across sign-in, scoped to the artist and retaining
the original About snapshot for stale-content validation. After authentication the form reopens
with an explicit unsent status and Send suggestion action. Only successful persistence shows
confirmation. Refs #1565. Correction controls match the interviewer; shared Radix dialogs use
the existing Music Nerd surface in both themes, preserving their individual layout constraints.

### October 17 — sign in before reporting

Pete approved a simpler entry flow: Suggest a correction opens login first for signed-out
visitors. After both Privy and the application session are authenticated, the report form
opens. Submit report persists the report; only a successful response displays Report received,
with a message that the team will review it and a Done button. Login alone never submits.
The continuation survives the application-session reload. Failures keep the form and text.

### October 17 — exact report deduplication

Pending reports are duplicates only when submitter, artist, About snapshot, reason, details
and normalized source URL all match. Distinct corrections remain separate review items; the
existing daily limit and per-user transaction lock still apply. Exact repeats show Report
already received and explain that no duplicate was added. Refs #1566.

### October 17 — edit and resolve in Lore review

Correction cards offer an inline About editor, with the original report and supplied source
remaining visible. It loads the current public About, rather than using the report's old
snapshot. Save and resolve commits the text, before/after history, admin activity and report
resolution together. Cancel writes nothing; failures retain the draft. A revision check rejects
changes to the About, claim or preparation since the editor opened, and pinned bios remain
protected. Only admins can read or save this editing context.

Eligible directory About is edited in its existing public projection, preserving the private
preparation, source manifest and identity gates. Edited official excerpts become researched
text; the existing citations remain attached. A report URL is not automatically accepted as a
citation. Claimed About edits use the artist bio. No generation or external request is started.

## Release audit corrections (2026-10-17)
Account linking transfers both correction authors and reviewers inside the existing merge transaction before deleting the placeholder account (#1568). Reports and review status remain intact; failure rolls the merge back.

Admin directory edits mark the public envelope `editedByAdmin: true`. Preparation must preserve that entire preparation on subsequent or overlapping runs (#1569); existing read-time identity/source eligibility checks still withdraw invalid evidence. Automatic regeneration cannot undo a human correction. There is no new automatic reset.

After confirmation is closed, a new report opens a clean form with the latest displayed About; an unfinished report retains its original snapshot for stale-edit protection (#1570).

The login-to-report handoff uses the existing themed dialog with “Finishing sign-in…” while Privy and the application session settle. A saved draft restores this status during auth hydration after the login reload. The old document must not expose the form briefly before that reload; the new document opens it only after both sessions are ready. Closing cancels continuation; no timer or automatic submission is used.
