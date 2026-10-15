# Ask About answer replay

Refs [#1448](https://github.com/xdjs/MusicNerdWeb/issues/1448), [#1424](https://github.com/xdjs/MusicNerdWeb/issues/1424), and [#1422](https://github.com/xdjs/MusicNerdWeb/issues/1422).

The API owns the durable `question_research` job and revalidates its public original references on every status read. Web owns answer drafting and checking. The initial POST binds a digest of the exact listener question to the returned job before acknowledging it. At most three distinct questions can use one research job, under a job-scoped transaction lock. A poll with an unregistered question is rejected before any model work. The API may reuse a job for a matching research plan; this cap prevents a known job ID and changing questions from causing unbounded answer drafts. A completed research job alone is not an answer: Web saves the first checked answer for the registered question and job before returning it. Concurrent pollers share one short drafting lease and receive HTTP 202 while the answer is checked. Reopening the same job returns the saved answer and citations without another model call or paid collection, provided the API still reports every cited original as currently eligible. An ineligible source withholds the saved answer; it is never presented as current Lore.

`artist_question_answers` stores a SHA-256 digest of the exact trimmed question, the checked public answer and stable citation coordinates, a lease, and a safe failure stage. It stores no asker ID, IP, email, raw question, private interview memory, or model scratch. Rows expire after 24 hours. Each request opportunistically removes expired rows; artist or research-job deletion cascades. Public database roles have no grants. `mnweb` can read, insert, update and delete; the Web route validates the artist and job, while the API checks current source eligibility. A failed answer check can be retried after a short delay, at most three times for that question, and cannot replace an already verified row.

A fresh Ask About mount starts an empty conversation and makes no research request. It does not read or write browser recovery records; records left by earlier versions are ignored. Opening chat must not replay a failed question, consume a drafting retry, or advance research. Minimizing and reopening the same mounted chat preserves its current turns and in-flight request. An explicit Try again on a failed current turn reuses that turn's durable job ID and updates the turn, without duplicating it. Stop waiting aborts polling without deleting the server job. Full reload clears the visible conversation; server job/answer retention is unchanged.

A future cross-session history feature must use a separate read-only saved-answer path with current source eligibility checks. The existing ask/status paths can draft answers or advance work and must not be called implicitly to hydrate history. There is no standalone “Reopen saved answer” or “Resume saved research” link.

Migration 0044 must be applied to staging before preview verification and to production before the dependent Web build is promoted. Verify grants and RLS as `mnweb` in each environment. Existing completed jobs have no saved answer and receive one draft/check on first reopen. Exact result replay lasts for the bounded retention period; after expiry, a new draft may be necessary if the research job and its public evidence remain available.

## Long questions on narrow screens

Question bubbles wrap long URLs within their available width. Ordinary prose keeps normal word wrapping; the full question text is retained during same-page retries. Verify the conversation at 390 px and 832 px in light and dark themes (issue #1450).

## Same-page follow-up context

The UI supplies up to four completed preceding question/answer turns from the current artist conversation, with each question capped at 500 characters and each answer at 3,000. Up to three exact HTTP(S) citation URLs (2,048 characters each) accompany each turn as source anchors. Oldest turns are dropped until the combined question, answer and URL text is at most 12,000 characters. This context disambiguates wording; it is not source evidence. Each question retains the exact context originally sent and the server-resolved standalone question, so explicit retries use the same meaning and job binding. The visible question stays in the listener's original words. Artist navigation clears this context.

## Pre-planning reuse (#1472, proposed)

A new server-only request index links a hash of the artist, current question and exact bounded
public conversation to the registered answer hash and research job. No raw question or history
is retained in this index. Exact wording, source URLs and their order remain significant; similar
wording is evaluated separately by the admitted semantic path described below. A changed conversation or explicit constraint is a new request.

Before reserving planning allowance, Web checks this binding and asks the API to revalidate its
originals. Only an already verified answer can return through this path. Private interview memory
is never consulted. Time-sensitive plans (latest/recent retrieval or explicit date windows) are not
reused here: validating an old source alone cannot establish that it is still newest. They retain
normal planning admission. A short durable request lease prevents concurrent identical requests
from spending duplicate planning slots. A competing request receives the existing busy response;
it does not start another planner. Failures do not refund planning allowance.

The index expires after 24 hours and cascades on artist/job deletion. Browser roles have no access;
`mnweb` has scoped table grants and RLS policies, with request authorization in the application.
Migration 0046 must be applied and verified with the app role before enabling this code in each
environment. Local SQL/mocked tests are not evidence of a deployed exhausted-quota browser check.

### Meaning-aware reuse — approved October 12

Exact matching is only the zero-model fast path. On its first occurrence, a paraphrase shares the
existing admitted planning call with candidate selection: Web supplies at most five verified answers
for this artist, their neutral public intent/routing and the complete selected original windows
actually cited by those answers. Their stored citation basis must match each window's source, revision,
coordinates, URL and text hash. Uncited research windows are omitted. The combined passage budget
remains 30,000 characters (the former five candidates × six excerpts × 1,000 characters ceiling).
A candidate that cannot fit is omitted rather than clipping its supporting sentence. This avoids
discarding useful saved answers because navigation text consumed a fixed leading excerpt.
The planner resolves the current public follow-up and decides whether an answer
fully covers it, whether the originals answer a different angle, or whether new research is needed.
No embeddings, vector database or additional classification call are introduced.

The model may select only an allowlisted candidate. Deterministic platform, original-URL, date and
exclusion boundaries cannot be overridden. Exact answer reuse additionally preserves evidence need
and answer scope. New wording and different angles may use the same originals, but always receive a registered, budgeted draft and original-context verification. Topic similarity alone never establishes a credit,
role, work/version or speaker. Every selected answer's actual source revisions/slices are rechecked
by the API before reuse; a revoked source, changed claim or invalidated revision falls back to normal
admitted research. Every first-time semantic variant, including a proposed equivalent paraphrase, must reopen originals and pass the existing question-aware draft/check pipeline before acceptance. The planner is a candidate selector, not editorial approval. Successful variants become digest aliases to their own checked answer, so subsequent exact repeats avoid planning too. Missing evidence continues through the normal
research path. Newest/recent/date-window questions are excluded from this answer cache and keep
normal retrieval; this change does not promise a fresh provider scrape.

`answer_intent` is model-generated neutral public intent, not the listener's verbatim question or
resolved conversation. Only the intent, existing neutral routing fields and digests are indexed.
Raw history, asker identity and private interview answers are never retained or searched here.
The index has the planning lane's 10-per-artist / 200-global active-key ceilings. Existing aliases
are checked before that ceiling. Failed unfinished admissions release their lease, without refunding
planning usage; abandoned unbound leases expire after 90 seconds. A completed job whose answer was never drafted retains its acknowledgement for 90 seconds; after that grace period it can return to admitted planning rather than becoming permanently busy.

### Separate planning and answer budgets (#1525)

A semantic candidate is revalidated and the new question is registered before Web returns HTTP 202
with its saved job ID. Planning does not start a new answer draft inside the same request. The browser
immediately calls the existing result endpoint for a complete acknowledgement, avoiding an extra
status read; that endpoint independently rechecks current source eligibility before drafting. Each
request retains its 55-second deadline beneath the route's 60-second limit, and drafting/checking
retains its own 45-second budget. This removes planning time from the answer budget without increasing
model calls, retries, research quotas, or lease/variant limits. Progress and the resumable job reach the
browser before expensive answer work. No opening-chat behavior changes.

A zero-citation semantic check continues ordinary research using the already-admitted server routing
stored in the request index; it is not evidence of absence. A server-only origin-job marker lets the
result endpoint claim one short continuation lease and lets concurrent requests join the same job.
The marker is never sent to the planner or research API. The ordinary API still enforces its provider
budget, current source scope and idempotency, and any new job must register the exact question before
acknowledgement. Returning the same job stops continuation instead of creating a loop. Operational
check failures remain errors with their saved job ID, rather than triggering blind new collection.
The browser follows the server-issued continuation job while retaining the same resolved question.
An active answer lease keeps its existing HTTP 202 behavior and never causes an unbounded second
draft. The maximum of three registered question variants per research job remains in force.
