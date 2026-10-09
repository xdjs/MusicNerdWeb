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
