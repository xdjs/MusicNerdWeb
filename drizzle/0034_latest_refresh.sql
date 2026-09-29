-- Collection-only work in the existing durable queue. No new grants or tables.
ALTER TABLE artist_research_jobs DROP CONSTRAINT artist_research_jobs_kind_check;
--> statement-breakpoint
ALTER TABLE artist_research_jobs ADD CONSTRAINT artist_research_jobs_kind_check
CHECK (kind IN ('social_ingest', 'caption_extract', 'lore_refresh', 'source_search', 'latest_refresh'));
