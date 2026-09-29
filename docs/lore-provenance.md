# Lore provenance and activity

Tracking: [#1371](https://github.com/xdjs/MusicNerdWeb/issues/1371). The implemented attribution foundation is in [#1373](https://github.com/xdjs/MusicNerdWeb/pull/1373); the About containment fix is in draft [#1372](https://github.com/xdjs/MusicNerdWeb/pull/1372). Neither alone completes the revised plan below.

## Decision — September 28, 2026

Pete requested this revision after identifying that the initial plan would leave unclaimed artists without a path to a new bio: discovery saves pending sources, while Lore consumes approved sources. Claiming governs artist control over the profile; it must not determine whether Music Nerd can publish a sourced directory bio. About still summarizes stored Lore and never starts research. This supersedes the earlier two-PR rollout plan, not the read-only About or attribution contracts.

The sections below distinguish the **implemented foundation** from the **planned work**. Automated source acceptance, automatic bios for unclaimed artists, and review attribution are not implemented in #1372/#1373. Bulk backfill is deferred below. No migration or release is authorized by this plan revision.

## Implemented foundation

Source origin is `submission`, `upload`, `research`, or `unknown`. The source points to an immutable `artist_activity_events` record with the initiating user ID, trigger, action and time. Sources inserted before attribution was introduced remain unknown; current ownership and insertion time are not evidence of who submitted them. Deduplication never replaces the original attribution. The user ID comes from server authentication or the durable initiating event, never the request body.

Activity records describe requests or committed changes, not a claim that all research completed. They store no prompts, extracted page text or provider responses. A worker's queued job carries `activity_id` outside mutable progress state; child jobs inherit it. Repeated/coalesced Lore refresh requests have their own records while the running job keeps its original initiator. The worker does not become the initiating user. Existing jobs without provenance remain unknown.

Recorded boundaries: visitor Lore suggestions, editor/onboarding source additions, uploads, explicit source searches, onboarding profile discovery, queued social research and Lore refreshes, source approval/rejection, and committed About edits/generation. Claim approval enqueues a durable source-search job under the approving admin; the worker reuses that initiation event. Trigger labels distinguish onboarding, editor search, manual refresh, source changes, upload, claim approval and maintenance. This is not a replacement for the deferred detailed research-run log (#1347): rejected search candidates and step-by-step model output remain out of scope.

September 28 — review corrections: durable source-search jobs require a completed search, so provider failures, source-write failures and exhausted deadlines propagate to the scheduler’s existing retry policy. A successful zero-result search may complete. Interactive discovery keeps its best-effort behavior. Until the paired About containment PR removes page-driven generation, that existing path records `system` / `automatic_about`; authenticated generation remains attributed to its user and `about_editor`. These labels describe existing work and do not authorize new page-triggered research.

Claim approval and research enqueue have distinct outcomes. An enqueue failure preserves the approved claim and its notifications, but returns a visible Admin warning with the existing Lore search action as the recovery path. A source-search job cancelled by an ownership/authorization change is marked done before reporting cancellation; it cannot remain running for repeated lease reclamation.

A duplicate source-search enqueue succeeds only when the existing live job belongs to the same claim. A stale job for a different or unrecorded claim returns the same recoverable warning rather than silently suppressing the new claim's discovery. The stale job retains its original attribution and is cancelled through the worker's ownership guard.

Source-addition activity is created only after a new source wins the URL uniqueness check, then linked within that same transaction. Losing duplicates leave no addition event; audit failure rolls the source back. Durable discovery checks its deadline before following index links, judging followed pages and each followed-source write, as well as before completion.

Admin Lore review shows source origin, account identity when recorded, trigger, Added time and current claim state. Search matches artist, source or contributor. Origin and claim filters combine with search; pagination preserves them. A separate Activity section lists attributable research/content actions with actor and artist search. Both use bounded server queries after a live admin check. The public source object carries only an event ID, never private actor fields; only Admin joins users.

## Planned source eligibility and review

Keep these independent:

| Dimension | Meaning |
| --- | --- |
| Origin | User submission, upload, research discovery, or unknown legacy origin |
| Initiator | Authenticated account or explicitly named system operation that requested the work, retained through worker handoffs |
| Automated assessment | Not assessed, accepted for synthesis, needs review, or failed; include check reasons, assessment time and policy version |
| Human review | Pending, approved or rejected, with the reviewer and review time; automated checks never write a human approval |
| Claim state | Who controls the artist profile, independent of evidence eligibility |

Research-discovered sources may become eligible without a human approval only after the automatic acceptance policy passes. Require retrieved, usable content, a supported match to the exact artist using independent identity evidence, and traceable support for facts used in the document. Successful fetching or an artist-name match alone is insufficient. Search snippets and model-invented URLs are never evidence. Paywalls, unreadable pages, conflicting identity and uncertain matches remain review items. Build on the existing verification helpers, but do not equate their present result with the new acceptance policy without testing that policy.

Initial automatic acceptance is scoped to research-discovered sources. User submissions/uploads retain their review flow; being logged in does not make arbitrary material automatically publishable. A human rejection excludes a source from synthesis and is not overturned by a retry, rediscovery or automatic reassessment. Preserve the current protections for explicit artist corrections and removals. Reassess eligibility when source content or artist identity changes. A rejected or invalidated source must be excluded from the next Lore/About revision, with an explicit stale/rebuild status until completed.

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

### User submission counts and manual review

Product labels: **User submissions**, **Automated research**, **Unknown origin** (plus **All**). Pete requested “user” rather than “human” in the Admin interface.

September 28 — Pete requested a count of user-contributed Lore and other UGC, plus filters that make those submissions easy to accept manually. First perform a read-only inventory using recorded origin/channel and submitter evidence. Report user submissions, automated research and unknown-origin records separately, with total and pending counts for each contribution type. The existing backlog cannot be classified as a direct user submission merely because it has a user ID: research may have been initiated by that account. Retain unknown where UI/API/MCP provenance or other direct audit evidence cannot establish origin. Do not infer origin from timestamps, current claim ownership or URL patterns.

Admin should offer an origin filter (User submissions / Automated research / Unknown origin / All), contribution-type filters (Link / Lore source / Upload), and review-status filters. Provide a one-click **User submissions · Pending** view for manual moderation, with named contributor, artist, submission time and visible per-item Approve/Reject actions. Research initiated by a user remains automated origin and separately displays the initiating user; it must not inflate the user-submission count. Unknown records remain available in their own review queue.

Counts must cover the full matching dataset, not just the current page, and count each submitted item once rather than counting discovery/review/activity events. Make pending versus all-status counts explicit, keep filters through pagination, and update both the queue and counts after moderation. No bulk acceptance is authorized by the inventory or filter work. Acceptance checks must include mixed user-submitted/research/unknown records, user-triggered research, duplicate discoveries, more than one page and approval/rejection changing the pending count.

### Contributions for a selected user

Pete clarified Carl's meeting request as **Admin → People → select a user → Contributions**. Provide an account-scoped view across link submissions, Lore submissions/uploads and research initiated by that account. Show contribution type, origin, artist, date, status and a link to the underlying item; share the origin/status filters and full-dataset counts. Distinguish the user's direct submissions from research results attributed to their request. This is implemented in #1373 alongside the initial Lore/research Activity section, with migrated, authenticated staging read/layout verification completed at `d215c5f5`.

## Delivery order and acceptance

1. Retain #1372/#1373 as the foundations; finish their outstanding migration and authenticated checks as part of the coordinated staging validation.
2. Implement and test source eligibility and review attribution first. Before any automatic publication, run a non-publishing assessment on representative readable, unreadable, namesake, rejected and sparse-evidence cases; inspect the proposed sources and generated claims.
3. Implement the attributed creation/request → research → Lore → About pipeline for unclaimed artists, with an explicit system-write policy, idempotency and cost limits.
4. Verify #1373’s user-submission inventory/filter and selected-user contribution view against migrated staging, extend the assessment/reviewer views and public generation labels, then verify the combined flow. Required cases: unclaimed artist with sufficient evidence gets a cited bio without human approval; ambiguous/no evidence stays ungenerated; page views enqueue nothing; duplicate requests do not duplicate work; rejection overrides automatic acceptance; claim changes/concurrent edits cannot overwrite artist work; source and bio revisions retain the initiator.
5. Release only after this unclaimed-profile path is verified. The two existing PRs are not the complete production rollout. Apply the final coordinated schema changes before their dependent code; migrations 0031 and 0032 are required; assessment/review fields will need a subsequent migration.

## Deferred — bulk backfill

September 28, 2026 — Pete: “lets leave bulk backfill for later.” Bulk missing-bio backfill, its tooling and batch execution are deferred with no scheduled date. They are not requirements for the current rollout or issue completion. Current work remains attribution, source eligibility/review, the generation flow for newly added artists or explicit research requests, and Admin visibility.

If resumed, first obtain missing-bio counts and a cost estimate, then plan capped/resumable batches, cancellation and a named initiating operation. Inspect a small sample before expansion. Never bulk-approve historical pending sources or overwrite existing/pinned bios. This retained outline is not authorization to implement or run the backfill.

## Migration and release

Migration SQL and Drizzle journal ship together. The audit table enables RLS, revokes browser-role access, and grants only SELECT/INSERT to mnweb; server application checks provide user authorization. Source and job attribution columns are nullable for existing data. Apply and verify the migration as the app role before deploying dependent code. Verify `artist_activity_events` grants/policies, both nullable `activity_id` columns, `artist_vault_sources.origin` defaulting to unknown, the expanded job-kind constraint including `source_search`, and child-job inheritance. The SQL explicitly replaces the existing constraint from migration 0024; older Drizzle snapshots did not track it. The About-only PR has no migration dependency.

## Implemented Admin contribution review — staging reads verified

In People, the contributor name and **View contributions** action occupy separate lines in both table and card layouts. The action uses secondary text styling with a 44px touch target, and long names wrap without colliding with the action or selection control.

September 28 — the account contribution view leads with the person's name and a smaller “Contribution history” label. A compact total/awaiting-review summary replaces the origin cards; origin counts stay in the filter and include all statuses within the current account, search and type scope. Contributions and Research activity form the account navigation, with All contributors as a secondary link. Dropdown changes apply immediately, search submits with Enter or its search control, and clear resets to the account's all-status history (or the global pending queue). Filters and pagination preserve the selected account. The user-review shortcut is shown only when user submissions are pending. Unknown-origin help appears beside that selected filter; no historical origin is inferred.

#1373 extends the attribution branch with `/admin/contributions`: one bounded, server-filtered inventory of link submissions and Lore sources/uploads, including an account-scoped view linked from People. Origin summaries show all-status and pending counts across that account/type/search scope; the selected origin/status narrows the item list. User submissions includes explicit source submissions/uploads and newly recorded website link submissions. Old link rows default to unknown; no actor inference or backfill. Existing link approval and Lore approve/reject actions are reused; link rejection is not added in this slice. Moderation refreshes server counts and the filtered queue. Processed, non-accepted links are excluded from the pending queue. A selected account also links to its research Activity history; research requests are not counted as submitted sources.

Migration `0032_ugc_submission_origin.sql` adds `ugcresearch.origin` with default `unknown`; the authenticated website submission path writes `submission`. Other writers keep unknown until explicitly classified. Exclude the Discord-notification sentinel and link rows without artists from the inventory. This slice implements the review entry point and counts, not automatic source acceptance or the unclaimed bio generation pipeline. PostgreSQL-backed local checks exercised People navigation, account scoping, type/origin filters, pagination, empty results and individual link/Lore moderation. Visual checks covered 832px and 390px in both themes using disposable data and a temporary local auth fixture; this does not prove deployed authentication or staging RLS. Migrations 0031 and 0032 must precede authenticated preview validation and a read-only inventory of the real backlog.

### Staging application — September 28, 2026

After explicit approval from Pete, migrations 0031 and 0032 were applied together in a staging SQL-editor transaction. Preflight confirmed the audit table and attribution columns were absent. Staging default grants include mnweb CRUD, so 0031 explicitly revokes mnweb privileges before granting SELECT/INSERT; the migration regression now includes that default-grant pattern. Postflight through the actual mnweb connection verified the four columns/defaults/nullability, the source-search job constraint, audit RLS and its two role-specific policies, app SELECT/INSERT without UPDATE/DELETE/TRUNCATE, and browser-role denial. Manual schema application does not reconcile historical migration tracking (#1148).

A read-only staging inventory found 173 pending Lore sources. All pre-existing contribution origins remain unknown; no actor was inferred and no sources were approved. This is staging data, not the production backlog. Signed-in preview read/layout validation passed at `d215c5f5`: counts, combined filters, pagination, selected-account history, linked Activity, rejected history and 832px/390px layouts in both themes. [Verification and captures](https://github.com/xdjs/MusicNerdWeb/pull/1373#issuecomment-5878788592). Live moderation was not performed; mutation checks use disposable local data. Production migrations and release are not authorized.
