# API-backed Web interviewer

Refs #1422 and #1424. Fifth accepted slice, after shared API knowledge/memory and Ask About research. This is an implementation contract; this branch is not released.

The Web interviewer decides what to ask. MusicNerdAPI supplies private, durable artist knowledge, including original Lore/PDF passages and exact interview memory. A summary or search hit helps locate a source; only a reopened original passage or an exact permitted answer can support a question's factual premise.

## Before every question

The host restores the latest exact answer, all applicable corrections and active topic boundaries from the mandatory memory endpoint. It follows every page and verifies one coherent snapshot. It fails explicitly when memory is unavailable, changed or exceeds the bounded context budget; it never silently drops an instruction. Mandatory memory is a host prerequisite, not an optional tool decision. Older permitted history is read through the API as needed, with previous offered/answered/skipped questions available for repetition checking.

Source tools are scoped to the authenticated artist and trusted API origin. The model cannot select another artist, credential or destination. Tool reads do not start scraping. The initial interviewer uses approved knowledge; pending public discoveries enter its archive only after artist review. Private uploads remain private.

## Editorial process

The interviewer retrieves, reads originals, compares angles, drafts one question and checks it before offering it. The tone is interested, precise and conversational; warmth does not justify a flattering premise or a generic personal-growth question. Prefer a concrete creative decision, revealing distinction or well-supported tension that invites information not already present in the archive. A connection needs evidence for both sides and honest wording about what is unknown. One question asks one thing. A follow-up preserves the latest answer's meaning and gives the artist room to disagree.

Titles/descriptions, artist speech, third-party interpretation, captions/transcripts and upload/event dates remain distinct. Evidence records retain complete source ids, revisions and offsets; they are never replaced by opaque shortened labels. References to an answer retain its id/revision and exact supporting words. A host validates quotes/offsets and a separate check compares the question, intended unknown and rationale with full original windows and memory. Model approval is not editorial acceptance.

## Interaction and persistence

Opening the profile reads existing state only. Start/Continue is an explicit action. Each next question is generated after the previous exact answer is saved, so it can respond to that answer. Resume returns the same offered question with its saved evidence. Durable sitting membership and offered timestamps survive reloads and never move during answer updates. Concurrent requests must converge on one offer; changed memory must invalidate a draft before it is stored. An explicit finish closes the sitting. Skipping one question does not create a topic boundary.

The artist can explicitly record exact topic instructions for the sitting or until retracted, and retract them. These use API#25 and survive a fresh client. Existing saved interview words and source URLs are preserved during rollout.

## Limits and verification

Set bounded API/model call counts, response sizes, original-context size and deadlines. Record usage and durations without putting transcripts, questions, tokens or private sources in logs. Stop with an actionable error when the bounds prevent a sound question.

Tests cover unavailable/incomplete memory, retained originals and changed revisions, title/voice/date confusion, unsupported connections, stale simultaneous answers, reconnect, explicit boundaries, skipped questions and repeated asks. Evaluate the complete retrieval → original reading → angle selection → drafting → checking chain against freshly copied production LATASHÁ and Dutchyyy sources, including Dutchyyy's private PDFs in the authenticated flow. Add transfer cases beyond existing diagnostics and measure usefulness, unsupported premises, missed qualifications, repetition, false rejections, latency and cost. Retain failures. Human editorial review remains required before accepting a quality claim.

The rollout flag is server-only `MUSICNERD_API_INTERVIEWER_ENABLED` (default false). The private Web route `/api/artist/{id}/interview` forwards real Privy credentials to the configured API origin; there is no development-admin fallback. The API persists sessions, exact offers/evidence and answers using migration 0042. Old offered questions are returned separately and can be completed through the API before a new sitting begins. The UI waits for an explicit Continue after saving an answer. Failed saves keep the unsent textarea contents; only a confirmed answer switches to the next-step control. Topic instructions require an explicit wording and lifetime and can be retracted. A claim or authentication change hides the previous user's state.
