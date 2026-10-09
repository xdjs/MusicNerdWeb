# Ask About and discovery review through MusicNerdAPI

Refs #1424 and #1422. Fourth accepted delivery slice; depends on [API#24](https://github.com/xdjs/MusicNerdAPI/pull/24) and [Docs#8](https://github.com/xdjs/MusicNerdDocs/pull/8). Not released.

## Asking a question

Ask About sends one bounded question to Web. Web translates it into a neutral public evidence request and asks MusicNerdAPI to check saved originals first, then its bounded source route when needed. Release dates and credits use those explicit evidence needs; an explicit Instagram/TikTok/X request preserves its platform or exact URL. The request does not contain visitor chat history or private artist memory. The server-only `MUSICNERD_RESEARCH_API_KEY` grants only the API's public research scope.

General questions default to stored evidence; an unprompted model choice cannot impose the API’s recent-only window and discard undated originals such as official bios. Explicit recent/latest requests retain their freshness route.

The first response acknowledges a durable job. The UI shows actual saved-source, outside-Lore search, collection and reading progress; it does not fabricate timer-based activity. A server proxy resumes existing API work and polls status with backoff. A reload can resume the job without starting paid collection again. The UI may stop waiting while the job remains durable; resume does not enqueue another request. Source failures and unresolved questions are explicit, never treated as proof that something did not happen. Request limits remain the API's documented limits, including five new requests per artist per day.

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
