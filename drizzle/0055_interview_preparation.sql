BEGIN;
SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
ALTER TABLE "artist_research_jobs" DROP CONSTRAINT "artist_research_jobs_kind_check";
--> statement-breakpoint
ALTER TABLE "artist_research_jobs" ADD CONSTRAINT "artist_research_jobs_kind_check" CHECK ("artist_research_jobs"."kind" in ('social_ingest', 'caption_extract', 'lore_refresh', 'source_search', 'latest_refresh', 'source_extract', 'question_research', 'spotify_match', 'interview_prepare'));
COMMIT;
