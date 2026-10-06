# Ask About and discovery review through MusicNerdAPI

Refs #1424 and #1422. Fourth accepted delivery slice; depends on [API#24](https://github.com/xdjs/MusicNerdAPI/pull/24) and [Docs#8](https://github.com/xdjs/MusicNerdDocs/pull/8). Not released.

## Asking a question

Ask About sends one bounded question to Web. Web translates it into a neutral public evidence request and asks MusicNerdAPI to check saved originals first, then its bounded source route when needed. Release dates and credits use those explicit evidence needs; an explicit Instagram/TikTok/X request preserves its platform or exact URL. The request does not contain visitor chat history or private artist memory. The server-only `MUSICNERD_RESEARCH_API_KEY` grants only the API's public research scope.

The first response acknowledges a durable job. The UI shows actual saved-source, outside-Lore search, collection and reading progress; it does not fabricate timer-based activity. A server proxy resumes existing API work and polls status with backoff. A reload can resume the job without starting paid collection again. The UI may stop waiting while the job remains durable; resume does not enqueue another request. Source failures and unresolved questions are explicit, never treated as proof that something did not happen. Request limits remain the API's documented limits, including five new requests per artist per day.

Before answering, Web reopens each exact source revision and surrounding original context through the API. It drafts from those passages only, with exact supporting quotes and stable references, then checks the draft against that original context. An unknown reference, changed revision, missing quotation, failed check or incomplete read withholds the claim. Titles, descriptions, summaries, upload dates and unverified speakers are not substitutes for evidence. A model check is a runtime safeguard, not editorial acceptance.

The public path does not read uploaded private files, interview answers/corrections or private review queues. It does not fall back to an uncited provider-grounded answer. Existing citation, literal supported Instagram-handle and verified music-link rendering stays available; unsupported entity links are withheld. Pending discoveries are clearly labelled as outside approved Lore. A reader can reopen the exact cited passage, while the external link opens the source website.

## Artist review

The artist's Lore editor lists pending discoveries through the authenticated API, with source URL, title, neutral relevance reason and identity state. The artist opens the exact original before approving it to Lore/Links, declining it, marking the wrong artist, or marking incorrect information. Review sends that exact revision; changed sources and account conflicts require a reload, never silent replacement. The API atomically records the decision and any promotion. This view uses the artist's Privy token; the public research key cannot perform review. Browser refresh restores pending decisions from the API. Visitor questions are never displayed to the artist.

## Verification and rollout

Test request routing, original-context reopening, quote/reference failure, pending curation, no private-source calls, rate/error handling, reconnect without enqueue, stale navigation, and exact-revision review. Exercise paired previews with current staging authentication; disposable fixtures only. Check 832px/390px and both themes, network errors and the zero-discovery state. Production activation requires API#24, migrations and a matching server key first. Until the key is configured, the existing Ask About path remains in use. Once configured, API failures never fall back to legacy evidence or uncited grounding. The new progress/source routes fail explicitly when their configuration is unavailable. Web interviewer integration remains a separate fifth slice and uses private mandatory memory from API#25.
