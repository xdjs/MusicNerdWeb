# Question research storage

Refs #1424 and #1422; contract: [MusicNerdDocs#8](https://github.com/xdjs/MusicNerdDocs/pull/8).

Migration 0040 adds `question_research` to the existing durable job kinds and adds two server-only tables. It renders no UI and does not enable collection by itself.

- `artist_research_candidates`: one URL per artist, destination Lore/Links, neutral reason code, separate identity/curation state, exact reviewed revision and reviewer/activity attribution. A decline and wrong identity are different decisions. The API additionally deduplicates normalized URLs under the artist lock.
- `artist_research_evidence`: append-only exact original text with SHA-256 revision and selected provenance. Composite foreign key binds it to the candidate's artist. Originals are bounded to 50,000 characters; provenance to 16KB. Refresh creates a new revision, never overwrites a cited body. A newer original is not automatically approved by an earlier review.

Both tables enable RLS. Browser `anon`/`authenticated` roles have no grants. `mnweb` may manage candidates and select/insert evidence, but cannot directly update/delete evidence. Candidate or artist deletion cascades through the retained versions. Role-wide policies are not individual authorization: API review must recheck current claimant/admin ownership inside the artist-locked transaction. Public research credentials have no private-memory or review permissions.

Apply this migration to the target database before enabling the matching API. API main merges currently auto-publish: migration readiness must precede that merge. Do not run the full migration journal to replay old manually applied migrations. Actual environment application and app-role verification must be recorded separately from the local PGlite SQL checks.

Local verification executes the real migration and covers app-role writes, immutable originals, browser-role rejection, cross-artist foreign keys, deduplication and cascade deletion. No real artist data is a test fixture.

`current_revision` identifies the last observed original independently of first-retention time. A page reverting to an older retained version updates this pointer without modifying immutable evidence. `reviewed_revision` separately records the version the artist accepted.

## Exact interview boundaries

Migration 0041 adds `artist_interview_boundaries` for the [mandatory-memory contract](https://github.com/xdjs/MusicNerdDocs/pull/8). It retains an explicit artist instruction, its scope (`sitting` or `until_retracted`), the exact offered question and fixed sitting, and creation/retraction attribution. A unique artist/request ID makes capture idempotent. Ordinary skipping does not create a boundary. The API owns authentication, current ownership checks and the atomic audit transaction; this migration enables no UI by itself.

RLS is enabled with no browser-role grants. The `mnweb` role may select/insert and update only the three retraction columns. It cannot rewrite original wording or origin, or directly delete history. Artist deletion cascades through these private records. Verification must exercise the column-level grants as the app role, including retraction and denied wording updates. Apply 0041 before deploying the dependent memory API. It is a separate migration: do not replay the already-applied 0040 to add memory.

## Interview sessions and saved evidence (0042)

Migration 0042 adds two private tables for the [API session contract](https://github.com/xdjs/MusicNerdDocs/blob/docs/question-research/proposals/interview-sessions.md). `artist_interview_sessions` allocates one explicit active sitting per artist with an idempotent request ID. `artist_interview_question_evidence` stores immutable exact source/answer references and the mandatory-memory snapshot beside the existing answer row. Unique session/ordinal and artist/sitting constraints prevent duplicate offers and sitting reuse. An artist/session composite foreign key prevents attaching evidence to another artist's session.

The app role may read/insert both tables and update only session state/closure time. Browser roles have no access; RLS is enabled. Exact answer words, question, sitting and offered time remain in the existing answer table. API transactions perform current-claim authorization, exact-original validation, snapshot checks and safe answer updates; the schema does not infer model correctness. Apply 0042 separately to staging and verify real `mnweb` access before deploying its API. Do not replay 0040/0041. Production application remains a release prerequisite.
