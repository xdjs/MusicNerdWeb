CREATE TABLE "artist_activity_events" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"artist_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"actor_kind" text NOT NULL,
	"action" text NOT NULL,
	"trigger" text NOT NULL,
	"source_id" uuid,
	"parent_activity_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artist_activity_actor_kind" CHECK ("artist_activity_events"."actor_kind" in ('user', 'system', 'unknown'))
);
--> statement-breakpoint
ALTER TABLE "artist_activity_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "artist_research_jobs" ADD COLUMN "activity_id" uuid;--> statement-breakpoint
ALTER TABLE "artist_vault_sources" ADD COLUMN "origin" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "artist_vault_sources" ADD COLUMN "activity_id" uuid;--> statement-breakpoint
ALTER TABLE "artist_activity_events" ADD CONSTRAINT "artist_activity_events_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_activity_events" ADD CONSTRAINT "artist_activity_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artist_activity_created_at" ON "artist_activity_events" USING btree ("created_at" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE INDEX "artist_activity_artist_created_at" ON "artist_activity_events" USING btree ("artist_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "artist_activity_actor_created_at" ON "artist_activity_events" USING btree ("actor_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "artist_research_jobs" ADD CONSTRAINT "artist_research_jobs_activity_id_artist_activity_events_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."artist_activity_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_vault_sources" ADD CONSTRAINT "artist_vault_sources_activity_id_artist_activity_events_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."artist_activity_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_research_jobs" DROP CONSTRAINT IF EXISTS "artist_research_jobs_kind_check";
--> statement-breakpoint
ALTER TABLE "artist_research_jobs" ADD CONSTRAINT "artist_research_jobs_kind_check" CHECK ("artist_research_jobs"."kind" in ('social_ingest', 'caption_extract', 'lore_refresh', 'source_search'));--> statement-breakpoint
CREATE POLICY "mnweb_select_artist_activity" ON "artist_activity_events" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_insert_artist_activity" ON "artist_activity_events" AS PERMISSIVE FOR INSERT TO "mnweb" WITH CHECK (true);
--> statement-breakpoint
REVOKE ALL ON TABLE public.artist_activity_events FROM PUBLIC, anon, authenticated, mnweb;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE public.artist_activity_events TO mnweb;
