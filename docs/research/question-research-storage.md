# Question research storage

Refs #1424 and #1422; contract: [MusicNerdDocs#8](https://github.com/xdjs/MusicNerdDocs/pull/8).

Migration 0040 adds `question_research` to the existing durable job kinds and adds two server-only tables. It renders no UI and does not enable collection by itself.

- `artist_research_candidates`: one URL per artist, destination Lore/Links, neutral reason code, separate identity/curation state, exact reviewed revision and reviewer/activity attribution. A decline and wrong identity are different decisions. The API additionally deduplicates normalized URLs under the artist lock.
- `artist_research_evidence`: append-only exact original text with SHA-256 revision and selected provenance. Composite foreign key binds it to the candidate's artist. Originals are bounded to 50,000 characters; provenance to 16KB. Refresh creates a new revision, never overwrites a cited body. A newer original is not automatically approved by an earlier review.

Both tables enable RLS. Browser `anon`/`authenticated` roles have no grants. `mnweb` may manage candidates and select/insert evidence, but cannot directly update/delete evidence. Candidate or artist deletion cascades through the retained versions. Role-wide policies are not individual authorization: API review must recheck current claimant/admin ownership inside the artist-locked transaction. Public research credentials have no private-memory or review permissions.

Apply this migration to the target database before enabling the matching API. API main merges currently auto-publish: migration readiness must precede that merge. Do not run the full migration journal to replay old manually applied migrations. Actual environment application and app-role verification must be recorded separately from the local PGlite SQL checks.

Local verification executes the real migration and covers app-role writes, immutable originals, browser-role rejection, cross-artist foreign keys, deduplication and cascade deletion. No real artist data is a test fixture.
