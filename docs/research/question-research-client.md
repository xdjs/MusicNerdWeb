# Ask About and discovery review through MusicNerdAPI

## Evidence journey alignment (#1424, implementation preview)

The preview-only `/review/1424/actual` serves a static, reviewed comparison of 32
recorded model answers against fictional originals (16 baseline/candidate pairs).
It identifies the evaluated commits, frozen scoring, partial blinding, remaining
strict omissions, mocked boundaries and costs. All source passages are available
inline. The separate `/review/1424` interaction remains manually illustrated.
The actual-results route has no scripts, model calls, remote assets or application
layout; a restrictive content policy blocks network integrations. It returns 404
outside local development and Vercel preview. This delivery route does not alter
the report's evaluated research logic at `3d344d91`, and observed output differences are not
proof of causality or completion of #1424.

The bounded second iteration preserves that report and its scores as development
evidence. `/review/1424/actual/iteration-2` compares prior logic `3d344d91`
with candidate `49f8eef0`, retaining all ten pairs: six fresh transfer cases and
four previously seen development cases. Locked blind answer review found three
candidate wins and one tie on development; transfer had no candidate wins, one
baseline win, four ties and one incomparable pair. The fresh archive-gap candidate
omitted the lost-copy explanation even though its checker reported complete.
Both versions clarified the catalog-title case under the existing topic limit;
the baseline also clarified the namesake case. No outcome or rubric was replaced.
The strict T05 omission remains recorded. Its no-name conclusion and bounded
explanation answer the visitor’s narrow mastering question; the additional missing-copy
explanation is a frozen rubric requirement, not a demonstrated product release blocker.
These data do not establish general improvement. All 40 model calls were accounted
at $0.20345875; confirmed all-history cost is $0.72000610, or $0.74734810 exposure
including the old unresolved reservation. No observed case exercised a repair
retry; its former deterministic branch tests did not establish a live benefit. The static versioned report includes
all exact displayed answers, sources, frozen strict scores and attribution limits.

Within the existing planning call, a required `publicSubject` describes
the selected public artist and explicitly stated identity qualifiers before topic
compression. The host preserves those declared phrases within the existing
160-character API topic, strips the planner-only object, and clarifies rather than
truncating overflow. Missing/malformed subject output fails before API dispatch.
Private experiences, raw conversation and contact details remain excluded. This
does not guarantee extraction of undeclared qualifiers: an empty or incomplete
model-produced qualifier list remains a measured limitation.

The smaller follow-up removes the experimental checker coverage field, coverage-driven
repair and notice overrides. Factual verification and its existing bounded repair
remain unchanged. A supported first draft no longer risks a second generation solely
for completeness. Per-work credit, distinct-speaker and cited-gap writer guidance stays.

The planner now declares public scope before composing topic and is instructed to
reuse each complete declared clause verbatim, including identity qualifiers and
negation. This instructs the planner to avoid generating two differently worded
versions of the same scope; compliance remains model-dependent.
The host still uses exact whole-phrase matching, appends missing declarations and
clarifies at more than 160 characters. It never interprets synonyms, drops clauses,
uses raw/private conversation as a fallback, or rewrites the old saved T02 outputs.
The old candidate output still clarifies; the older baseline output lacks the
required subject field and fails closed under the final schema. Canonical fixture
replays establish wiring only. The separate `/review/1424/actual/compact-routing`
report records two new final-code confirmations against `f33d7796`: T02 generated a
115-character topic and a cited title/artist answer; T01 generated a 77-character
public topic, omitted the private setup from dispatch/answer and retained the
civil-identity limitation. Six calls cost $0.02406125 with no generation retries.
These two known synthetic cases establish observed behavior, not general accuracy
or deployed storage/authentication acceptance. All-history confirmed cost is
$0.74406735, exposure $0.77140935 including the old $0.027342 reservation. No further
tuning or model calls followed. Prior reports and scores remain immutable.

Web uses the server-only public research HTTP capability for question jobs, status
and exact original reads. MusicNerdAPI owns public evidence selection, source
access and acquisition. Web owns public conversation resolution, admission and
answer leases, checking and presentation; these orchestration tables are not a
second evidence index. The API's `createQuestionResearchTools` SDK wraps the same
routes for agent clients and is not a separate Web database reader.

A useful uncertainty explanation may be a `kind: limitation` sentence in the
structured answer. It needs the same exact supporting quotes and independent
claim check as any fact, and must stay scoped to the supplied originals. For
example, an explicitly incomplete credit list supports explaining why a missing
name does not settle participation. This is not permission to invent absence.
When cited sentences address every requested part, including explicit supported
gaps, the writer sets `unanswered=null`. Otherwise the host preserves the writer’s
fixed missing-detail notice, including after retaining only independently supported
sentences. The checker does not override that notice based on a coverage judgment.
Free-text `unanswered` is never rendered,
even if a checker approves it; zero-sentence results retain the safe fallback.

Candidate selection is only permission to attempt a checked answer. After originals are reopened, a host-accepted schema-valid zero-sentence
candidate result can continue the same job into research. That result returns
before the independent claim checker; it is not independent proof of insufficiency. Failure to
verify a draft is not proof of insufficient evidence: provider, schema, original
access and factual-check failures remain withheld, with bounded retry. They do
not automatically authorize outside collection or reset budgets.

Existing verified answers retain their normal 24-hour reuse lifetime. These
planner/writer changes apply to newly processed work; they do not invalidate
request bindings or silently rewrite existing saved answers.

Citation rendering recognizes numeric source markers and the legacy Artist Doc
marker. Ordinary bracketed prose, speaker qualifications and timestamps stay
visible. Source links and exact-revision passage reads retain their access rules.

Refs #1424 and #1422. Fourth accepted delivery slice; depends on [API#24](https://github.com/xdjs/MusicNerdAPI/pull/24) and [Docs#8](https://github.com/xdjs/MusicNerdDocs/pull/8). Not released.

## Asking a question

Ask About sends one bounded question to Web. Web translates it into a neutral public evidence request and asks MusicNerdAPI to check saved originals first, then its bounded source route when needed. Release dates and credits use those explicit evidence needs; an explicit Instagram/TikTok/X request preserves its platform or exact URL. The request does not contain visitor chat history or private artist memory. The server-only `MUSICNERD_RESEARCH_API_KEY` grants only the API's public research scope.

General questions default to stored evidence; an unprompted model choice cannot impose the API’s recent-only window and discard undated originals such as official bios. Explicit recent/latest requests retain their freshness route.

The first response acknowledges a durable job. The UI shows actual saved-source, outside-Lore search, collection and reading progress; it does not fabricate timer-based activity. A server proxy resumes existing API work and polls status with backoff. A reload can resume the job without starting paid collection again. The UI may stop waiting while the job remains durable; resume does not enqueue another request. Source failures and unresolved questions are explicit, never treated as proof that something did not happen. Request limits remain the API's documented limits, including five new requests per artist per day.

When an unresolved result carries the API's `unsupported_speech` limitation, Web
says: “I couldn't establish what was said from the saved sources.” The status
contract does not distinguish a server capability decision from a model-selected
evidence limitation. A null provider can occur in either case, and an
`instagram_reels` provider does not guarantee sufficient speech evidence. Web
therefore makes no transcription-capability claim from this reason alone. It also
does not claim that the retained record is caption-only, that no transcript exists
elsewhere, or that the artist said nothing. Rendering the limitation starts no
additional drafting or provider work. Existing quota, refresh and account messages
retain their precedence.

Before answering, Web reopens each exact source revision and surrounding original context through the API. It drafts from those passages only, with exact supporting quotes and stable references, then checks the draft against that original context. An unknown reference, changed revision, missing quotation, failed check or incomplete read withholds the claim. Titles, descriptions, summaries, upload dates and unverified speakers are not substitutes for evidence. A model check is a runtime safeguard, not editorial acceptance.

The public path does not read uploaded private files, interview answers/corrections or private review queues. It does not fall back to an uncited provider-grounded answer. Existing citation, literal supported Instagram-handle and verified music-link rendering stays available; unsupported entity links are withheld. Pending discoveries are clearly labelled as outside approved Lore. A reader can reopen the exact cited passage, while the external link opens the source website.

## Artist review

The artist's Lore editor lists pending discoveries through the authenticated API, with source URL, title, neutral relevance reason and identity state. The artist opens the exact original before approving it to Lore/Links, declining it, marking the wrong artist, or marking incorrect information. Review sends that exact revision; changed sources and account conflicts require a reload, never silent replacement. The API atomically records the decision and any promotion. This view uses the artist's Privy token; the public research key cannot perform review. Browser refresh restores pending decisions from the API. Visitor questions are never displayed to the artist.

## Verification and rollout

Test request routing, original-context reopening, quote/reference failure, pending curation, no private-source calls, rate/error handling, reconnect without enqueue, stale navigation, and exact-revision review. Exercise paired previews with current staging authentication; disposable fixtures only. Check 832px/390px and both themes, network errors and the zero-discovery state. Production activation requires API#24, migrations and a matching server key first. Until the key is configured, the existing Ask About path remains in use. Once configured, API failures never fall back to legacy evidence or uncited grounding. The new progress/source routes fail explicitly when their configuration is unavailable. Web interviewer integration remains a separate fifth slice and uses private mandatory memory from API#25.

Failed answer verification records only its stage (original read, draft, exact quote, or claim check), an allowlisted error category and HTTP status. Never log a question, original, model draft or provider exception. A failed check remains withheld; retry reuses the saved job.

The queue response is always an acknowledgement, including a reused completed job. Web returns the job first and reads status to obtain revalidated references before answering. An answer-verification failure retains its job id for retry even when it occurs before the first progress response.

Relative-time descriptions (new/latest/upcoming) in undated or older originals remain attributed to that source or are omitted; they are not promoted into current release facts. An official third-person bio is not automatically first-person artist speech. The complete-process evaluation retains guard rejections and missed qualifications, including ones a model checker approves.

## Conversational answers (2026-10-09)

Ask About speaks like an informed music fan: lead with the useful update, use plain verbs and natural contractions, and include a source/date where it helps. Avoid report-like openings such as “the newest material in these sources indicates that.” A dated, attributed update can answer a latest question without claiming exhaustive coverage; explicit newest claims still require bounded wording. Keep uncertainty that changes the meaning, exact evidence, citations and source-reading safeguards. Do not turn experimenting into a launch, a caption into speech, or a post date into a release date. This changes public Ask About wording only; interviewer prompts and memory are separate.

## Explicit source routing (2026-10-09)

A platform explicitly named in the current question is a routing constraint, not a model suggestion. Instagram, TikTok, X/Twitter, InProcess, Spotify and Deezer are supported source scopes. The planner cannot silently substitute another source. Recognized source URLs carry their provider scope; a conflicting requested platform and URL is rejected. Multiple named platforms must not collapse to a single model-selected platform. An unspecified platform leaves saved-source retrieval broad. InProcess/Spotify/Deezer use their durable provider originals; unavailable scoped evidence reports the need to refresh that provider rather than launching unrelated social research. Follow-ups may reuse an exact cited source only when consistent with the current request.

### Regression review cases

Keep these as distinct checks when changing retrieval, models or prompts; a model's approval alone is not editorial acceptance:

| Question or negative control | Required behavior |
| --- | --- |
| What did Pete post most recently on InProcess? | Preserve InProcess scope; use its newest eligible saved original, never substitute TikTok. |
| What has Pete shared about his Rango Labs plugin designs? | Attribute the experiment to the post; use the original moment date, not fabricated publication metadata or a launch claim. |
| What is LATASHA's latest Instagram post about? | Date and cite the retrieved caption; qualify any newest claim; preserve music-production versus filming credits and exact supported identities. |
| Who filmed it? after that answer | Resolve to the same cited visualizer and its exact filming credits. |
| What is DUTCHYYY's latest release? | Prefer eligible catalog release records over newer social posts; do not treat upload time as release time. |
| What exact knob controls are shown in that video? with only the post record | Do not infer visual content from title or MIME type. |
| When did Pete release those plugins? with only an experiment post | Do not convert an experiment or intended release into an actual launch. |
| Bad draft: the visualizer “which she produced with Eli” when the caption credits music production to a handle | Reject role compression and unsupported handle-to-name expansion. Accept wording that preserves music production and the original handle. |

Record all failures, correction attempts and latency alongside successes. The small fixture set is diagnostic coverage, not a claim that all music questions or all supported sources have passed editorial review.

The end-to-end DUTCHYYY regression “What's Dutchyyy's latest release?” initially planned `reporting/latest`, selecting a newer InProcess moment instead of a catalog record. Latest-release identification now requests `release_date/latest`; questions about a release's credits, captions or story retain their respective evidence needs. This is a Web planning correction in addition to the API catalog preference.

## Readable provider evidence (2026-10-09)

For Spotify/Deezer catalog records and In Process moments, Ask About labels the
original reader **Source details**. It displays the stored title, release type and
release date, or collection, description and posted date, with an original-source
link. It omits internal account and record identifiers. Dates retain their stored
precision. Invalid or incomplete records show an unavailable message instead of
raw JSON. Captions, transcripts and article passages retain the **Read passage**
label and exact text. This changes presentation only: original revisions and the
evidence used to check answers are unchanged, and opening details starts no research.
## Public-chat answer quality (2026-10-10)

The planner distinguishes broad activity overviews (`answerScope=overview`) from
focused questions (`focused`, the default). A broad latest overview asks the shared
API to consider several recent originals and select distinct activities; a latest
post or release question retains its narrow scope. Web reopens at most three
selected originals, drafts once and checks once, with the existing single bounded
repair. There is no extra stylistic model pass.

Answers lead with the useful activity, in plain language. Dates, platform names,
filenames and collection titles appear only when they help answer the question.
Source cards carry provenance; source attribution in prose remains necessary for
interpretation, recollections and uncertainty. An archival upload is not a new
release; an artist not finding a file does not establish that no copy exists.
Broad answers cover distinct supported updates when available, group related posts
and do not invent thematic or causal connections. One supported update is acceptable
when that is all the evidence establishes.

New answer registrations use a versioned question fingerprint so checked answers
from the earlier response policy are not presented as newly evaluated output.
The existing per-job answer limit and expiry remain enforced. Requests already in
flight across deployment resume their existing registration: the current policy
row wins when present; otherwise the legacy exact-question row is used, including
its existing lease, attempts and expiry. A verified legacy answer may replay only
while its original evidence remains eligible. No old answer rows are deleted or
budget counters reset for this change.

Audit boundaries: public shared-API chat carries up to four public turns for reference
resolution; prior prose is not factual evidence. The private artist interviewer is
separate and unchanged. Legacy chat remains a configuration fallback and is not
evidence of shared-API verification. Stored provider coverage is incomplete and
URL exclusions can be broader than one fact; do not claim comprehensive freshness.

Broader follow-ups resolve generic exclusions (such as “the archival posts”) to
named projects in permitted public conversation. These names constrain retrieval
and drafting; the old answer remains navigation context, never factual evidence.
Different URLs or incidental details from the excluded project do not count as
other activity. If no supplied original answers outside that boundary, return a
missing-information response rather than repeating the project.

## New-question throttling and saved answers (2026-10-14)

Issue #1506 separates starting a question from collecting an existing answer.
`POST /api/askArtist` keeps the strict middleware allowance. The browser collects
and resumes answers with `POST /api/artist/{id}/questionResearch/{jobId}/answer`,
which shares the existing bounded default request tier with status reads. Its body
accepts only the question; validated URL parameters bind the artist and saved job.
It never plans research, registers a new question, or enqueues another job.
The existing server-only public research key, artist/job checks, registered question,
current-source revalidation, drafting lease and three-attempt limit still apply.
This public result route does not require artist login or expose private memory.

For a temporary429 carrying a valid `Retry-After` delay of at most two minutes,
the browser waits and retries the same request, at most three times within the
existing five-minute operation timeout. It displays the wait and permits stopping.
A saved job and its resolved question survive the wait and explicit retry. A quota
response without `Retry-After` remains an error; it does not automatically start
new work or reset budgets. Existing clients using the old POST resume shape remain
supported, but continue to use that route's strict request tier until refreshed.
