-- Existing durable queue, API-owned worker. No new grants, policies or tables.
-- Apply this file atomically through an authorized DDL-capable connection.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE artist_research_jobs DROP CONSTRAINT artist_research_jobs_kind_check;
ALTER TABLE artist_research_jobs ADD CONSTRAINT artist_research_jobs_kind_check
CHECK (kind IN ('social_ingest', 'caption_extract', 'lore_refresh', 'source_search', 'latest_refresh', 'source_extract'));
COMMIT;
