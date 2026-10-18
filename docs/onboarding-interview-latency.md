# Onboarding interview latency (#1314)

The first optional interview uses a fixed private plan of at most three questions. The API prepares the plan once from stored social material. Drafting plus source verification have one 15-second deadline, propagated to the actual model calls, with SDK retries disabled. There is no polling wait for social ingestion. Unsupported or unfinished drafts never become questions; distinct optional general questions fill any gaps.

The plan is stored in `artist_onboarding_interview_plans`, keyed by artist and scoped to the active claim. Reloads, cold starts, answers and skips reuse it. Changing a claim invalidates reuse, and each write rechecks the claim under the existing artist lock. Concurrent preparations adopt the first saved plan. Model work never runs under a database lock. Prepared questions are not answers and never appear as artist testimony. Existing artist words and offer/sitting timestamps remain intact.

The API checks saved answers before offering a question. A history-read failure shows a recoverable error and must neither restart the interview nor confirm it complete. After three distinct answered/skipped keys, it advances to the existing unpublished draft review. The public Ask About chat and the deferred #1422 interviewer are unchanged.

## Migration and rollout

Apply the new private-plan migration before deploying the API reader. RLS and server-role-only grants keep plans out of direct browser reads. Verify CRUD through the actual `mnweb` role and denial for `anon`/`authenticated`. No existing answer or artist row is backfilled or reset. Web has no new browser protocol: it renders the existing progress/step events. The progress label is `Preparing your questions…`.

## Acceptance

- One preparation for an onboarding interview, including a failed/empty preparation that selects general questions; later skips and resumes make no additional generation call.
- Real source-backed questions retain their original URLs. Verification failure cannot admit an unsupported question.
- Distinct fallback questions, a monotonic count, and no repeat of a saved answered/skipped key.
- A 15-second preparation ceiling cancels draft/verification work. Ordinary answer persistence and draft publication are outside this budget.
- Scoped authorization, concurrent first-writer behavior, failed history read and persisted artist words tested independently.
- Record actual first-question and Skip timings on the exact API preview. Test the real Web entry point before release; unit timing bounds are not provider latency measurements.

## Durable preparation revision — 2026-10-17 (unreleased)

The interview keeps access to the artist's saved knowledge and original-source tools, alongside
exact answers, question history and topic instructions. Preparation must not be limited to the
latest answer. Latency is measured across retrieval, drafting, checking and any repair; hiding
slow generation behind a background job is not evidence that generation is fast.

Web queues preparation explicitly through the API session `prepare` endpoint. Opening the
artist page or interview reads saved state only. A ready candidate is consumed explicitly and
becomes an offer only after the API revalidates its memory. Saving an answer in an opted-in
session queues preparation for the next question. Changed answers or topic instructions must
invalidate stale candidates. The existing research worker advances preparation jobs, with
cron recovery when the browser is closed. Web's pump is restricted to `interview_prepare` jobs.

The popup shows Save answer and Skip question while answering, preparation progress while
waiting, and a Next question action only for a ready candidate. Preferences and responses are
collapsed; Reload appears for recovery. Closing preserves the scoped browser draft. Finish
persists the session closure before dismissing the popup.

Dependencies: Web migration `0053_interview_preparation` expands the existing job-kind check;
MusicNerdAPI PR #56 supplies the worker and session preparation contract; MusicNerdDocs PR #23
records the API contract. These changes require paired preview verification before release.
The ten-second preparation target is not yet established by end-to-end measurements.

## Prepared session revision — 2026-10-17 (in progress)

Pete rejected the one-question preparation flow after a saved answer was followed by a
failed generation. Before Start is available, prepare the remaining questions for the
three-question session as a durable bank. Saving an answer must preserve eligible bank
questions; it must not unconditionally discard them and start paid generation again.
Before offering a stored question, verify current claim, sources, topic instructions,
and whether the latest answer already covers it. Follow-up preparation must not block
ready, eligible questions. Validate the full answer → next → finish flow on staging.

Remove the nested Preferences & responses wrapper. Topic preferences and This session’s
responses are direct, matching expandable controls, separated by whitespace rather than
dividers touching their edges. Verify the rendered layout on desktop and phone.

## Immediate transitions — 2026-10-17 (unreleased)

At explicit Start the API atomically offers the checked three-question bank, fixing all
offer timestamps then. Web already has the next question: saving or skipping persists an
exact answer intent in an account/artist-scoped browser outbox and advances immediately.
A serialized background writer confirms each response; no model call, loading screen or
Next button interrupts the fixed set. Responses remain local until the server acknowledges
the exact answer. Failed saves show a retry without losing words; Finish and preference
changes wait for all responses to be confirmed. Reload replays unconfirmed intents safely.

New topic instructions invalidate the already offered bank and stop advancement; saved
answers remain intact. Finish is explicit, and session-scoped instructions end with it.
Future preparation uses new answers; the current fixed set is not regenerated between saves.

Fresh-claim preparation is automatic after approval once usable saved research is ready,
per the October 17 decision. Start remains opt-in, and page reads remain read-only.

## Returning artists and ready-state controls — 2026-10-17 (unreleased)

The fresh-claim test does not establish repeat-session latency. Pete's existing-history
session exposed a null batch draft followed by expensive sequential fallback work and a
polling gap. Verify repeat preparation against the artist's accumulated history as well
as a fresh claimant. A completed worker checkpoint resumes promptly; readiness waits and
failed/empty work retain the ordinary polling interval, with no concurrent requests.

Before any questions are offered, the ready state has Start interview and Topic preferences
in a single wrapping action row. Finish is shown only after a session has offered questions.
While background preparation is pending, the invitation is disabled instead of opening a
waiting-only popup; saved offered questions remain accessible. Claim preparation metadata
is readable before its private session exists, so the page can notice readiness.
The successful Finish notification describes the completed session even when the API has
already prepared a private next-session handoff. API-side repeat prewarming is tracked in
MusicNerdAPI PR #56; it must not recursively create unused interviews or write on page reads.

### Topic preferences layout

Topic preferences replaces the interview body within the existing dialog. Back returns to the
same question and unfinished answer. The form uses the interview's bounded scroll area and
shared controls, rather than an anchored popover that can extend above the viewport. Session
scope is labeled “For this session.” Verify one dialog, draft preservation, and usable controls
on desktop and mobile in both themes.

Your responses uses the same in-dialog view and Back control as Topic preferences. Questions
and exact saved answers remain in the interview scroll area, without a second overlay. The
view and Finish confirmation direct artists to “Edit profile → Lore → Questions” to edit later.
