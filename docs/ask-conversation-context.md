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

Broad follow-ups such as “what else has he been up to?” keep newest-available retrieval and remove a single-post anchor. Previously cited public URLs become bounded `excludeSourceUrls`, so the API selects other evidence rather than repeating the same update. The history remains only the current public chat; artist interview memory is not consulted.

Progress is short: “Checking Lore…” for saved evidence/answer preparation; “Searching outside Lore…” for external collection. Internal API instructions are never displayed. A failed worker is an operational error, not an AI answer. Explicit retry of a terminal failure starts a new normally budgeted request with the same public context; it does not repeatedly poll the dead job or bypass quotas.

## Date and original selection (#1491)

Planning receives the current UTC date. A single yearless named calendar day referring to a past post uses its latest occurrence on or before that date; explicit years stay exact. Ranges, future requests and explicit historical context remain planner interpreted. A newly dated question selects originals by date rather than inheriting an old citation; same-post follow-ups without a new date retain their anchor; a current literal URL remains authoritative and must still pass API scope checks. URLs pasted with sentence punctuation admit the prose-delimited spelling without dropping the literal spelling or broadening the source allowlist.

For other-activity follow-ups, excluding an individual post/work does not exclude an entire archive or collection. Both drafting and checking enforce that distinction. They still reject a whole excluded category when requested, unsupported media descriptions, invented connections and overstated source claims. Final quote/claim rejection has a bounded diagnostic code distinct from provider, schema or timeout failures; no question, source text, rejected draft or checker explanation is logged. Historical failures with only a stored stage cannot establish their precise original cause.

### Conversational routing and source selection (October 14, 2026)

The model resolves follow-up intent from the bounded public conversation rather than a
phrase whitelist. Other-activity follow-ups exclude already-discussed sources without
silently excluding their entire collection. Explicit user exclusions retain their scope.

API evidence selection is a relevance decision over original source IDs, not a second
answer-generation task. It returns unchanged original windows; the Web answer stage still
reopens exact revisions, verifies supporting quotes, and checks claims before displaying
citations. A malformed quotation in an intermediate selection must not trigger a paid
scrape. Unknown source IDs and unresolved identities remain ineligible.

When outside research is needed, the model chooses among server-validated available
lookups; there is no fixed Instagram-first priority. Explicit source restrictions,
connected-account identity, public-source access, durable job checkpoints and spending
budgets remain enforced by code. Source discovery never approves Lore.

Provider records may encode a title or description as JSON. The answer writer receives decoded text fields from complete records, and quote verification accepts only contiguous literal wording within one such field (or the unchanged raw passage). Decoding is limited to `latest:` records; it does not concatenate fields, repair malformed/truncated JSON, relax wording, or replace the independent claim check. Original revision/offset verification still runs before drafting.

A rejected extra sentence must not erase independently verified useful facts or force another model cycle. The checker may explicitly identify sentence numbers that fully answer part of the question and remain supported with all other sentences removed. Only those sentences survive immediately after either check; unsupported extras and unanswered text are discarded. Invalid indices or no independently supported sentences still fail closed. Original reads, exact quotes, and the existing two-draft/two-check budget remain enforced.


## Preserve the selected evidence through drafting (#1492)

Web accepts the API's complete selected set of up to six public references. Drafting,
checked citations, saved-answer storage, and reuse candidates share that six-reference
ceiling; none silently drops the fourth through sixth original. More than six references
are rejected before original reads or model calls. Each original is reopened with at most
12,000 characters, for a maximum of 72,000 original characters across the answer. Surrounding
context never displaces the selected exact slice. This replaces the previous implicit
36,000-character ceiling caused by reading only three references. Original identity, revision,
offsets, metadata, exact quotes, and independent claim checks remain required. The 45-second
deadline and at most two drafts/two checks are unchanged.

A draft with zero factual sentences returns the existing fixed, nonempty evidence limitation.
If both checked drafts lack a supported sentence, verification fails closed instead of returning
a blank answer. Whitespace-only sentence text and saved answers are rejected.


### Saved-answer latency investigation — October 15, 2026 (#1525)

The answer path revalidates the entire selected passage with up to 1,200 characters
of preceding and following context, capped at the existing per-original limit. It
does not expand every short selection to 12,000 characters. Every selected slice
still verifies against the current public original and revision; identical read
requests share one request-local promise. This is bounded context, not whole-document
verification. A missing detail still requires further retrieval.

The candidate independent checker is Sonnet 5.5; the writer remains Gemini 3.8 Flash.
A frozen ten-case check (three supported, seven unsupported claims) accepted/rejected
all ten correctly in one pass, including music-versus-filming roles, caption-versus-
speech, unverified speaker attribution, publication-versus-event dates and excluded
projects. The same fixture check with Opus 5.5 Fast missed the unverified-speaker case.
This is a regression screen, not broad quality acceptance or production verification.
Full source revalidation, exact-quote matching, independent semantic checking, bounded
repair, and fail-closed handling remain required. No unchecked draft is streamed.

A separate read-only API candidate selector is being evaluated to skip the model
evidence-selection loop for readily available saved material. It must not classify
ranked passages as sufficient, lose saved-question history, bypass quotas, or replace
durable fallback research. Planner, registration, transport and UI timing must be
included before claiming the live chat is fast.

October 15 preview follow-up: the deployed candidate still failed on a latest question.
A replay of its saved originals also reproduced false factual rejections and a
redundant second writer/checker cycle. The revised checker focuses on factual
support rather than writing style, requests a concise diagnostic, and accepts
independently supported sentences after the first check. A local 12-case screen
(10 earlier positive/negative fixtures plus two drafts from this failure) passed;
this is targeted evidence, not production or end-to-end latency acceptance.

A subsequent six-case frozen-source trial with the concise Sonnet writer completed
the four supported questions in 2.61–5.30 seconds and withheld unsupported credit
and spoken-only claims in 1.31–1.56 seconds. This excludes planner/network/UI time.
It supersedes the earlier Gemini-writer selection for this candidate. Separate
writer/checker calls now use the same Sonnet model, with low effort, no retries,
and unchanged evidence validation. Model diversity is not claimed.
