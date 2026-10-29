# Directory onboarding visibility (#1371)

The October 8 decision is Links/Latest first. Until an approved claim exists, stored About and Lore must not be included in public profile props, metadata, JSON-LD, bio reads, knowledge exports, MCP output or Ask About context. An administrator can still review private prepared material through authorized editor flows. Approved claim status is read at the public boundary; pending/rejected/revoked claims do not qualify. Claim changes invalidate eligibility on the next read; claim-sensitive responses must not be shared-cacheable.

Public profile destinations and Latest posts/catalog material remain available before claim. A destination source is projected to its link metadata only, excluding extracted text and snippets. Public chat may read public social/catalog evidence, but not pre-claim vault evidence. Authenticated claimant/admin knowledge tools retain their authorization checks. Cached answers must revalidate public originals through the API.

This first coordinated Web/API change implements the visibility prerequisite only. Directory-add queueing and private About preparation follow after the boundary is verified. Existing records and human review states are not rewritten. Claim approval does not approve pending sources or overwrite bios, pins or interview answers.

## Directory discovery and private preparation contract

A successful new directory insertion atomically records a `directory_add` activity with the real adding account and one `source_search` job fenced to the unclaimed generation. Existing-artist matches and retries do not enqueue another operation. The record remains usable when providers later fail. An ordinary adding account is the recorded initiator, not an artist editor: only this persisted creation event grants the API worker its narrowly scoped unclaimed background operation; claim changes cancel it.

The API reuses source search and verified profile adoption, then queues public social/Latest collection and a private preparation stage under the same activity. It records an automated eligibility assessment against each exact source-text revision: only explicitly confirmed artist identity and readable original text qualify. Pending sources remain pending; rejection wins. Name-only, ambiguous or unreadable sources may remain leads but do not feed a prepared narrative. Assessment never substitutes for artist approval.

A separate private preparation record stores the document, About draft, exact source manifest/revisions, starting bio snapshot and job lineage. It never writes `artists.bio`, the publicly readable `artist_docs`, source approval or onboarding completion. Model calls happen outside locks; committing rechecks the artist claim, active job, evidence revisions and curation. Insufficient evidence is a recorded empty outcome, not an invented About. A retry can reuse a current preparation and must not regenerate indefinitely.

After claim approval, the rightful claimant reviews pending sources through the existing vault-review step. Automatic onboarding must stop auto-approving all pending rows. Pre-existing approved/rejected decisions survive. A prepared About can be reused only after its exact inputs remain eligible and the relevant sources have been approved; changed/declined inputs invalidate the draft and generation uses the newly approved evidence. Publishing still uses existing pin/manual-edit/claim fences and remains an explicit claimant decision. A claim approval alone does not publish the preparation.

Rollout order: Web/API visibility prerequisites → schema and API worker support → Web directory-add enqueue/claim handoff. No bulk backfill. Verification covers real unclaimed material, duplicate add, ordinary submitter attribution, provider failure, source rejection/revision changes, claim change during work, unauthorized retrieval, pins/edits and explicit review/publish.

### Private preparation storage (migration 0047)

`artist_source_assessments` records an exact original snapshot only after both readable extraction and affirmative identity assessment; it does not change curation. `artist_directory_preparations` stores the resulting private document/About and exact manifest separately from public artist fields. Both tables have RLS and server-role-only CRUD grants. Rejected, changed, ambiguous, unreadable or unassessed sources cannot enter that draft. Beginning any claim cancels the directory operation; this stricter fence also prevents a rejected/revoked claim from accidentally reviving an older pre-claim job. Existing claim-approved research remains separate.

### Recent discovery handoff

Claim approval may skip its normal `source_search` enqueue only when a versioned,
completed directory-discovery checkpoint is no more than 24 hours old and still
matches the artist identity, original creation activity, source revisions and current
approved claim. A ready private About alone is not proof that discovery completed.
Human review status is excluded from the discovery fingerprint: approving or rejecting
a source must not itself restart paid discovery, and reuse never changes that decision.

Missing, stale, changed or unrecognized checkpoints use the existing
claim research path. An operational checkpoint-read failure also falls back to that
path. Claim approval and notifications remain committed regardless of enqueue outcome;
the existing research warning appears only if neither reuse nor enqueue succeeds.
The API must enforce the same checkpoint at onboarding entry, rather than having Web
skip work that the first onboarding request immediately repeats. Prepared narrative
reuse remains a separate, stricter approved-manifest check at the publish step.
Discovery reuse must preserve recovery of unfinished social ingestion; a completed
source search alone does not prove Latest ingestion has completed.

The checkpoint stores immutable `completedAt` epoch milliseconds as a JSON number.
This records successful discovery before downstream queue operations: a later parent
job retry or failure cannot repeat successful discovery or extend its 24-hour age.
A parent job without this valid checkpoint always takes the normal research path.
Malformed, missing, future or expired completion times are ineligible.

Saved profile review must show existing YouTube channel links as YouTube coverage.
The missing-platform hint normalizes the display category only; removal still sends
`youtubechannel` so the stored channel field is changed, not an unrelated handle.

### Add-to-profile handoff (#1524)

Search selection and the pasted-URL dialog open the saved artist immediately after
creation and its directory-discovery job commit. Identity validation reads only the
provider artist identity; release counts and top tracks are unnecessary to add it.
The best-effort artist-added notification runs through Next's post-response `after`
lifecycle, so notification reads or delivery cannot hold up the saved profile.
The creation event and discovery job remain in the transaction, not in `after`.

Search keeps a short adding/opening status visible outside its dropdown after blur,
with a direct profile link once saved. The artist route has a loading boundary,
so navigation acknowledges the destination while existing data loads. Loading does
not restart research, invent completion, or expose private About/Lore. Existing
identity conflicts, duplicate choices and cancelled-response guards still apply.

Search suppresses an external catalog result only when its platform and artist ID
match a saved result. A matching name alone does not establish identity: distinct
same-name artists and unresolved cross-platform matches remain selectable, with
their original provider link. Selecting one still uses the existing duplicate
review and explicit create-separate safeguards; search does not merge identities.

Duplicate review compares the selected catalog profile with saved Music Nerd profiles
in the existing themed dialog. It shows each name, an already available image, and
canonical provider links; it does not fetch extra catalog material or infer that
matching names or different provider IDs prove identity. “Use existing profile”
opens that profile's link-review flow, rather than silently saving the new link.
“Add different artist” retains the explicit force-create check and is unavailable
for verified reciprocal matches. Back/Escape may dismiss comparison before a
mutation starts; navigation and dismissal remain blocked during creation.

Background hub discovery must distinguish user-chosen handles from provider-assigned
Spotify, Deezer and YouTube channel IDs. On an affirmed own domain or a saved owned
account page, those IDs do not need to resemble the artist name to survive the
mixed-account filter. Merely linking a known public account from a third-party
article does not grant this exception. Existing saved values, conflicting owners,
multiple candidate accounts for one platform, rejected pages and deadlines still
block adoption. This does not turn album, song or playlist URLs into artist links,
or automatically repair older records whose artist destination was never found.

### Live directory discovery after add (#1524)

Artists are added through MusicNerdAPI's `POST /api/artist` (#1628). Only a
successful new-artist commit schedules an artist-scoped `source_search` wake
through Next `after` in the API. The awaited, time-bounded wake uses the API's
own research worker and lease; notification delivery runs independently. Wake failure cannot
undo artist creation, create another job, or hide its usable profile. Production
cron remains the durable recovery path. Vercel preview/custom staging deployments
do not receive cron invocations, so preview downstream execution needs an explicit,
authorized worker check; a pending queue is not evidence of completed discovery.

For the first 24 hours, the adding account or an admin can read a minimal discovery
status and fingerprint of the already-public Links/Support destinations. An open
profile polls that read-only projection for at most ten minutes, pauses while
hidden, aborts requests on exit, and refreshes when public links change, plus once on terminal completion to show
new Latest material. Unchanged active polls do not refresh the page.
Nothing in the page read or polling route starts research. The endpoint returns no
sources, passages, actor details or job payloads. About and Lore retain their
existing claim/approval boundaries.

Completion waits for the directory source search and jobs in its creation lineage,
including downstream preparation/social jobs. The API always queues caption
extraction after normal social completion, even when it found no posts: the observer
keeps that short done-parent/missing-child handoff active rather than stopping early.
A failed enqueue still requires worker recovery; this reader does not repair it.
A queued downstream job remains
active; a failed job or changed claim is not called complete. The final link
snapshot is read after terminal status, so writes at completion are still shown.
The observer timeout stops watching, not the durable work. Deferred Spotify
matching remains separate work in #1528 / MusicNerdAPI#45.
