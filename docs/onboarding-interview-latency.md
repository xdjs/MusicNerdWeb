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
