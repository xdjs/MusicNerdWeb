BEGIN;
SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
CREATE TABLE "provider_request_cooldowns" (
	"provider_key" text PRIMARY KEY NOT NULL,
	"blocked_until" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "provider_request_cooldowns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "artist_research_jobs" DROP CONSTRAINT "artist_research_jobs_kind_check";--> statement-breakpoint
ALTER TABLE "artist_research_jobs" ADD CONSTRAINT "artist_research_jobs_kind_check" CHECK ("artist_research_jobs"."kind" in ('social_ingest', 'caption_extract', 'lore_refresh', 'source_search', 'latest_refresh', 'source_extract', 'question_research', 'spotify_match'));--> statement-breakpoint
CREATE POLICY "mnweb_select_provider_request_cooldowns" ON "provider_request_cooldowns" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_insert_provider_request_cooldowns" ON "provider_request_cooldowns" AS PERMISSIVE FOR INSERT TO "mnweb" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_update_provider_request_cooldowns" ON "provider_request_cooldowns" AS PERMISSIVE FOR UPDATE TO "mnweb" USING (true) WITH CHECK (true);
--> statement-breakpoint
REVOKE ALL ON TABLE public.provider_request_cooldowns FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE public.provider_request_cooldowns TO mnweb;
COMMIT;
