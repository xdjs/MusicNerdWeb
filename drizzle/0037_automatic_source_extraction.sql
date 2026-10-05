-- Keep legacy live-job uniqueness and ON CONFLICT inference unchanged.
-- No grants or RLS changes. Requires 0036 and the version-2 API worker before use.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE artist_research_jobs DROP CONSTRAINT artist_research_jobs_status_check;
ALTER TABLE artist_research_jobs ADD CONSTRAINT artist_research_jobs_status_check
  CHECK (status IN ('pending','running','done','failed') OR
    (status = 'queued' AND kind = 'source_extract' AND coalesce(state->>'version','') = '2'
      AND coalesce(state->>'autoSourceId','') <> ''));
CREATE UNIQUE INDEX artist_research_jobs_auto_source_live ON artist_research_jobs (
  artist_id, (state->>'autoSourceId')
) WHERE kind = 'source_extract' AND state->>'version' = '2'
  AND status IN ('queued','pending','running');
COMMIT;
