# Ask About follow-ups and latest questions

Ask About may send up to four completed turns from the current artist's current
page visit. Each question is at most 500 characters and each answer at most 3,000;
Each turn can also carry up to three exact citation URLs from its rendered answer,
HTTP(S) only and at most 2,048 characters each. Combined question, answer and URL
text is limited to 12,000 characters. The server rejects oversized or
unexpected fields before model/API work. This is public visitor conversation,
never private interview memory. Context is untrusted reference-resolution input,
not evidence for a factual answer.

The planner resolves a follow-up to one standalone question, preserves the
visitor's scope, and sends only neutral public research terms to MusicNerdAPI.
The standalone question binds the durable checked-answer cache and is returned to
the client for polling and explicit retry. Original wording remains in the chat.
For a follow-up about the same post/work/version, the planner can select an exact
prior citation as `targetUrl`, preserving the original source rather than widening
the search to every related work. An unrelated question, ambiguous citation, or
comparison must not inherit that anchor. The server accepts only exact current-question
URLs or explicit `sourceUrls`, never a URL merely embedded in prior answer prose.
These URLs are navigation hints; API eligibility and original-source reading still
apply, and conversation text never becomes evidence. No prior conversation is persisted. Missing or ambiguous context must not invent
a work, person or relationship.

`retrieval: latest` requests the newest available dated material for an overview
or latest post, with an explicit platform when supplied. It does not impose an
implicit seven-day cutoff. Explicit date bounds still apply. Topical research
uses `retrieval: relevance`; recent topical questions retain their freshness
filter. This optional routing field requires the paired MusicNerdAPI change.

Verification covers reference resolution input, source-only answer grounding,
request budgets, cache binding, polling/retry continuity, and generic latest
versus topical recent routing. Interview routes and memory are unchanged.

Publication-date citations use a typed evidence field: `text` (the default)
requires a matching original-body quote; `publishedAt` requires exact equality
to non-null publication metadata. The latter establishes only source publication
time, never event/release timing or post content. Mixed claims need their relevant
body evidence too. The checker enforces those meanings and rejects unqualified
claims to know an artist's latest material from a bounded collection.

The checked-answer cache binds the source's publication value as well as exact
text, revision and offsets. Changed publication metadata or legacy cached answers
without that recorded value are withheld rather than silently replayed.

If the third drafting attempt loses its worker and its lease expires, polling returns a terminal verification failure; it cannot keep waiting or start a fourth attempt.

Typed `activityDate` evidence must equal the current original metadata and require the original’s server-authoritative `activityDateKind`: `release` dates a catalog release; `moment` dates the recorded item/post, not an event shown or a product launch. Date-plus-content claims require both date and text evidence. An In Process structured provider title can establish the posted topic with attribution; generic search/page titles and untranscribed video remain insufficient for claims about spoken or visual content.

A failed exact-quote or factual check permits one internal repair using the same reopened originals and 45-second deadline. Feedback is untrusted diagnostic data, never new evidence. The repair repeats exact validation and the full factual check; a second rejection fails closed. This raises the per-attempt model ceiling from two to four calls (two drafts and two checks); the durable three-attempt job/question cap is unchanged. Provider/service/schema failures do not trigger an automatic model retry, and repair never starts outside research.

The public factual checker uses the independent `MODEL_ASK_CHECKER` (Opus 5.5), while drafting uses the independently configured `MODEL_ASK_DRAFT`. A targeted eight-call Flash comparison accepted the flawed music-vs-video credit/name expansion twice under each tested configuration; the four-call Opus comparison rejected it twice and accepted the corrected answer twice. This small diagnostic is not broad editorial acceptance. Opus averaged 4.25 seconds versus baseline Flash 1.15 seconds (about three extra seconds per check). The more expensive checker has a 1,500-token output cap, no provider retries, at most two checks, and shares the unchanged 45-second deadline and four-call repair ceiling.

A final six-case pipeline comparison adopted Gemini 3.8 Flash with low thinking for `MODEL_ASK_DRAFT` (2,400 output tokens, no retries). Three dated Instagram answers passed in 8.3–11.8 seconds versus two of three on the prior writer (successful answers 15.7–18.8 seconds); the Pete topic answer passed in 9.0 seconds and unknown visual controls remained unresolved. The unknown plugin release date stayed unknown but its answer included insufficiently scoped absence wording (“there isn’t any record…”), a retained editorial limitation rather than a claim of perfect quality. All six outcomes were retained. This targeted comparison does not establish general success rates; the same two-round, four-call, 45-second ceiling remains.

Absence claims must explicitly name their bounded scope in the actual sentence (the sources read/provided); context alone cannot turn “there is no record” into a supported claim. The recorded plugin-release failure was accepted by the old checker and rejected after this explicit invariant in a two-call comparison. Model-written `unanswered` prose is never rendered: a fixed host sentence states “The sources I could read don’t establish that detail.” Existing factual sentences still require exact evidence and the full checker. Earlier failures remain retained, and this targeted fix is not general editorial acceptance.

Typed date quotes preserve year-only and year-month catalog precision through exact metadata equality; text evidence retains its eight-character minimum. A missing day must never be invented.
