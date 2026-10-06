BEGIN;

CREATE TABLE "artist_research_candidates" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"artist_id" uuid NOT NULL,
	"url" text NOT NULL,
	"destination" text NOT NULL,
	"platform" text,
	"platform_id" text,
	"reason" text NOT NULL,
	"identity" text DEFAULT 'unresolved' NOT NULL,
	"curation" text DEFAULT 'pending' NOT NULL,
	"source_id" uuid,
	"reviewed_by" uuid,
	"review_activity_id" uuid,
	"reviewed_revision" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artist_research_candidates_artist_url" UNIQUE("artist_id","url"),
	CONSTRAINT "artist_research_candidates_artist_id" UNIQUE("artist_id","id"),
	CONSTRAINT "artist_research_candidates_url" CHECK (char_length("artist_research_candidates"."url") between 1 and 2048 AND "artist_research_candidates"."url" ~ '^https?://'),
	CONSTRAINT "artist_research_candidates_destination" CHECK ("artist_research_candidates"."destination" = 'lore' OR ("artist_research_candidates"."destination" = 'link' AND "artist_research_candidates"."platform" IS NOT NULL AND "artist_research_candidates"."platform_id" IS NOT NULL)),
	CONSTRAINT "artist_research_candidates_reason" CHECK ("artist_research_candidates"."reason" IN ('reporting','release_date','credits','social_caption','spoken_content')),
	CONSTRAINT "artist_research_candidates_identity" CHECK ("artist_research_candidates"."identity" IN ('confirmed','unresolved','wrong_artist')),
	CONSTRAINT "artist_research_candidates_curation" CHECK ("artist_research_candidates"."curation" IN ('pending','approved','declined','wrong_artist','incorrect'))
);
--> statement-breakpoint
ALTER TABLE "artist_research_candidates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "artist_research_evidence" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"revision" text NOT NULL,
	"title" text,
	"original_text" text NOT NULL,
	"provenance" jsonb NOT NULL,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artist_research_evidence_candidate_revision" UNIQUE("candidate_id","revision"),
	CONSTRAINT "artist_research_evidence_revision" CHECK ("artist_research_evidence"."revision" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "artist_research_evidence_text" CHECK (char_length(btrim("artist_research_evidence"."original_text")) > 0 AND char_length("artist_research_evidence"."original_text") <= 50000 AND char_length(coalesce("artist_research_evidence"."title",'')) <= 500),
	CONSTRAINT "artist_research_evidence_provenance" CHECK (jsonb_typeof("artist_research_evidence"."provenance") = 'object' AND octet_length("artist_research_evidence"."provenance"::text) <= 16384 AND coalesce("artist_research_evidence"."provenance"->>'kind' IN ('original_text','caption','provider_transcript'), false))
);
--> statement-breakpoint
ALTER TABLE "artist_research_evidence" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "artist_research_jobs" DROP CONSTRAINT "artist_research_jobs_kind_check";--> statement-breakpoint
ALTER TABLE "artist_research_candidates" ADD CONSTRAINT "artist_research_candidates_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_research_candidates" ADD CONSTRAINT "artist_research_candidates_source_id_artist_vault_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."artist_vault_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_research_candidates" ADD CONSTRAINT "artist_research_candidates_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_research_candidates" ADD CONSTRAINT "artist_research_candidates_review_activity_id_artist_activity_events_id_fk" FOREIGN KEY ("review_activity_id") REFERENCES "public"."artist_activity_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_research_evidence" ADD CONSTRAINT "artist_research_evidence_candidate_artist" FOREIGN KEY ("artist_id","candidate_id") REFERENCES "public"."artist_research_candidates"("artist_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artist_research_candidates_review" ON "artist_research_candidates" USING btree ("artist_id","curation","id");--> statement-breakpoint
CREATE INDEX "artist_research_evidence_latest" ON "artist_research_evidence" USING btree ("candidate_id","retrieved_at","id");--> statement-breakpoint
CREATE INDEX "artist_research_evidence_artist" ON "artist_research_evidence" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "artist_research_jobs_question_created" ON "artist_research_jobs" USING btree ("created_at") WHERE "artist_research_jobs"."kind" = 'question_research';--> statement-breakpoint
ALTER TABLE "artist_research_jobs" ADD CONSTRAINT "artist_research_jobs_kind_check" CHECK ("artist_research_jobs"."kind" in ('social_ingest', 'caption_extract', 'lore_refresh', 'source_search', 'latest_refresh', 'source_extract', 'question_research'));--> statement-breakpoint
CREATE POLICY "mnweb_select_artist_research_candidates" ON "artist_research_candidates" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_insert_artist_research_candidates" ON "artist_research_candidates" AS PERMISSIVE FOR INSERT TO "mnweb" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_update_artist_research_candidates" ON "artist_research_candidates" AS PERMISSIVE FOR UPDATE TO "mnweb" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_delete_artist_research_candidates" ON "artist_research_candidates" AS PERMISSIVE FOR DELETE TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_select_artist_research_evidence" ON "artist_research_evidence" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_insert_artist_research_evidence" ON "artist_research_evidence" AS PERMISSIVE FOR INSERT TO "mnweb" WITH CHECK (true);

-- Both tables are server-only. User authorization remains in API/Web code.
REVOKE ALL ON public.artist_research_candidates, public.artist_research_evidence FROM PUBLIC, anon, authenticated, mnweb;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artist_research_candidates TO mnweb;
GRANT SELECT, INSERT ON public.artist_research_evidence TO mnweb;
COMMIT;
