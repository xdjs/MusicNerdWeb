# Lore provenance and activity

Tracking: [#1371](https://github.com/xdjs/MusicNerdWeb/issues/1371). The implemented attribution foundation is in draft [#1373](https://github.com/xdjs/MusicNerdWeb/pull/1373); the About containment fix is in draft [#1372](https://github.com/xdjs/MusicNerdWeb/pull/1372). Neither alone completes the revised plan below.

## Decision — September 28, 2026

Pete requested this revision after identifying that the initial plan would leave unclaimed artists without a path to a new bio: discovery saves pending sources, while Lore consumes approved sources. Claiming governs artist control over the profile; it must not determine whether Music Nerd can publish a sourced directory bio. About still summarizes stored Lore and never starts research. This supersedes the earlier two-PR rollout plan, not the read-only About or attribution contracts.

The sections below distinguish the **implemented foundation** from the **planned work**. Automated source acceptance, automatic bios for unclaimed artists, and review attribution are not implemented in #1372/#1373. Bulk backfill is deferred below. No migration or release is authorized by this plan revision.

## Implemented foundation

Source origin is `submission`, `upload`, `research`, or `unknown`. The source points to an immutable `artist_activity_events` record with the initiating user ID, trigger, action and time. Sources inserted before attribution was introduced remain unknown; current ownership and insertion time are not evidence of who submitted them. Deduplication never replaces the original attribution. The user ID comes from server authentication or the durable initiating event, never the request body.

Activity records describe requests or committed changes, not a claim that all research completed. They store no prompts, extracted page text or provider responses. A worker's queued job carries `activity_id` outside mutable progress state; child jobs inherit it. Repeated/coalesced Lore refresh requests have their own records while the running job keeps its original initiator. The worker does not become the initiating user. Existing jobs without provenance remain unknown.

Recorded boundaries: visitor Lore suggestions, editor/onboarding source additions, uploads, explicit source searches, onboarding profile discovery, queued social research and Lore refreshes, source approval/rejection, and committed About edits/generation. Claim approval enqueues a durable source-search job under the approving admin; the worker reuses that initiation event. Trigger labels distinguish onboarding, editor search, manual refresh, source changes, upload, claim approval and maintenance. This is not a replacement for the deferred detailed research-run log (#1347): rejected search candidates and step-by-step model output remain out of scope.

Admin Lore review shows source origin, account identity when recorded, trigger, Added time and current claim state. Search matches artist, source or contributor. Origin and claim filters combine with search; pagination preserves them. A separate Activity section lists attributable research/content actions with actor and artist search. Both use bounded server queries after a live admin check. The public source object carries only an event ID, never private actor fields; only Admin joins users.

## Planned source eligibility and review

Keep these independent:

| Dimension | Meaning |
| --- | --- |
| Origin | Human submission, upload, research discovery, or unknown legacy origin |
| Initiator | Authenticated account or explicitly named system operation that requested the work, retained through worker handoffs |
| Automated assessment | Not assessed, accepted for synthesis, needs review, or failed; include check reasons, assessment time and policy version |
| Human review | Pending, approved or rejected, with the reviewer and review time; automated checks never write a human approval |
| Claim state | Who controls the artist profile, independent of evidence eligibility |

Research-discovered sources may become eligible without a human approval only after the automatic acceptance policy passes. Require retrieved, usable content, a supported match to the exact artist using independent identity evidence, and traceable support for facts used in the document. Successful fetching or an artist-name match alone is insufficient. Search snippets and model-invented URLs are never evidence. Paywalls, unreadable pages, conflicting identity and uncertain matches remain review items. Build on the existing verification helpers, but do not equate their present result with the new acceptance policy without testing that policy.

Initial automatic acceptance is scoped to research-discovered sources. Human submissions/uploads retain their review flow; being logged in does not make arbitrary material automatically publishable. A human rejection excludes a source from synthesis and is not overturned by a retry, rediscovery or automatic reassessment. Preserve the current protections for explicit artist corrections and removals. Reassess eligibility when source content or artist identity changes. A rejected or invalidated source must be excluded from the next Lore/About revision, with an explicit stale/rebuild status until completed.

Lore uses readable, eligible sources: human-approved sources or automatically accepted research sources, excluding rejected sources. Approval by itself does not make an unreadable source citable. Store the source manifest and document revision used by About so later changes can be traced. Public generated bios should be identified as Music Nerd-generated, never artist-approved merely because the profile is claimed. Do not relabel historical bios whose origin was not recorded.

## Planned generation flow

1. An authorized artist-creation operation or explicit research request creates an attributed durable job. Record the actual requesting account and trigger; a background worker retains that identity. A named system/backfill operation is identified as such, without inventing a human caller. Duplicate artist additions and page views do not start new work.
2. Discover and assess sources under per-run limits, deduplication and cooldowns. Persist acceptance results separately from human review.
3. Build stored Lore from eligible evidence, including for an unclaimed artist. Persist the source manifest and revision.
4. Generate About from that stored Lore revision. If sufficient evidence is unavailable, retain the existing bio or an honest empty state and surface the reason in Admin. Do not fill gaps with model guesses.
5. For a new or missing bio, publish the generated result after its citation/evidence checks pass. Automatically refresh only bios positively identified as system-generated and not pinned or subsequently edited by a person; preserve existing/manual/pinned/unknown-origin text. Recheck claim changes and concurrent edits before saving. Claiming later grants editing/review control without replacing the bio or reattributing earlier research.

The automatic flow must not call an editor-only route with a fabricated user or bypass existing ownership checks. Define an explicit system-job write policy for unclaimed artists, cancel/reconcile stale work when a claim changes, and test it before enabling the pipeline. Source-review changes should schedule the necessary Lore and eligible automatic About rebuilds without initiating fresh discovery. Keep research, Lore building and About synthesis as distinguishable job actions with retained root attribution and success/failure status.

## Planned Admin changes

Extend #1373 to show origin, requested by, request trigger/time, automated assessment and reason, human review status/reviewer/time, and current claim state as separate fields. A compact expanded detail view can hold the full evidence trail; every primary action must remain visible at phone and desktop widths.

Default the human review queue to items needing attention. Automatically accepted items are available through filters/history without being mislabeled as human approvals or filling the pending-review count. Keep actionable filters for assessment, human review, claim state and contributor; preserve them through pagination. Make research/Lore/About failures and insufficient-evidence outcomes visible, and link resulting sources and document/bio revisions to the initiating job. Keep personal account data behind live Admin authorization.

## Delivery order and acceptance

1. Retain #1372/#1373 as the foundations; finish their outstanding migration and authenticated checks as part of the coordinated staging validation.
2. Implement and test source eligibility and review attribution first. Before any automatic publication, run a non-publishing assessment on representative readable, unreadable, namesake, rejected and sparse-evidence cases; inspect the proposed sources and generated claims.
3. Implement the attributed creation/request → research → Lore → About pipeline for unclaimed artists, with an explicit system-write policy, idempotency and cost limits.
4. Extend Admin and public generation labels, then verify the combined flow in staging. Required cases: unclaimed artist with sufficient evidence gets a cited bio without human approval; ambiguous/no evidence stays ungenerated; page views enqueue nothing; duplicate requests do not duplicate work; rejection overrides automatic acceptance; claim changes/concurrent edits cannot overwrite artist work; source and bio revisions retain the initiator.
5. Release only after this unclaimed-profile path is verified. The two existing PRs are not the complete production rollout. Apply the final coordinated schema changes before their dependent code; migration 0031 may need a subsequent migration for assessment/review fields.
## Deferred — bulk backfill

September 28, 2026 — Pete: “lets leave bulk backfill for later.” Bulk missing-bio backfill, its tooling and batch execution are deferred with no scheduled date. They are not requirements for the current rollout or issue completion. Current work remains attribution, source eligibility/review, the generation flow for newly added artists or explicit research requests, and Admin visibility.

If resumed, first obtain missing-bio counts and a cost estimate, then plan capped/resumable batches, cancellation and a named initiating operation. Inspect a small sample before expansion. Never bulk-approve historical pending sources or overwrite existing/pinned bios. This retained outline is not authorization to implement or run the backfill.

## Migration and release

Migration SQL and Drizzle journal ship together. The audit table enables RLS, revokes browser-role access, and grants only SELECT/INSERT to mnweb; server application checks provide user authorization. Source and job attribution columns are nullable for existing data. Apply and verify the migration as the app role before deploying dependent code. Verify `artist_activity_events` grants/policies, both nullable `activity_id` columns, `artist_vault_sources.origin` defaulting to unknown, the expanded job-kind constraint including `source_search`, and child-job inheritance. The SQL explicitly replaces the existing constraint from migration 0024; older Drizzle snapshots did not track it. The About-only PR has no migration dependency.
