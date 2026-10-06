# Source extraction job prerequisite

October 5, 2026. Refs [#1424](https://github.com/xdjs/MusicNerdWeb/issues/1424) and [MusicNerdAPI#20](https://github.com/xdjs/MusicNerdAPI/pull/20).

The API's explicit source extraction endpoint queues `source_extract` in `artist_research_jobs`. This Web-owned migration adds that value to the existing kind constraint. No table, grant, RLS policy or Web interaction changes. The API owns the worker, authenticated queueing and sanitized extraction status; the Web interviewer remains a later phase.

Apply only migration `0037_source_extract.sql` through an authorized schema-owner connection, first to staging, then before dependent API code is released to production. Do not replay the entire migration history: drift reconciliation remains #1148. The migration executes under a transaction; its short table lock has a five-second acquisition limit. Check the final constraint and verify `mnweb` can insert this kind through the authorized API path. The existing live-job unique index and all five prior kinds remain valid.

The source extraction migration was renumbered from 0036 to 0037 after main added `0036_music_destination_owner_indexes.sql`. Its SQL is unchanged. Staging already received that constraint change through a manual schema-owner application; this renumbering does not require another staging write or resolve migration-history drift.

Rollback requires cancelling/removing any `source_extract` jobs first, then restoring the previous five-value constraint. Rolling back the API does not require narrowing the constraint. Never remove existing jobs automatically just to roll back the schema.

This prerequisite does not implement automatic extraction after Web source add/approval, immutable historical source versions or interview-memory boundaries.
