-- Page-level source units for grounded chat; additive. Apply before MusicNerdAPI `unit_sync` deploys.
-- Also adds AFTER DELETE triggers on artist_vault_sources, artist_social_posts and
-- artist_research_evidence that delete the matching source_units rows.
-- The vector extension is installed in `public` because the app role `mnweb` has no USAGE on `extensions`, like the other app-used extensions. Where an earlier draft already created it in `extensions`, the equivalent one-off is `ALTER EXTENSION vector SET SCHEMA public;`.
BEGIN;
SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
--> statement-breakpoint
CREATE TABLE "source_units" (
	"id" uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4() NOT NULL,
	"source_kind" text NOT NULL,
	"source_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"source_revision" text NOT NULL,
	"unit_index" integer NOT NULL,
	"locator" text NOT NULL,
	"title" text,
	"url" text,
	"text" text NOT NULL,
	"text_hash" text NOT NULL,
	"tokens" integer NOT NULL,
	"ocr" boolean DEFAULT false NOT NULL,
	"ingest_version" integer NOT NULL,
	"search" tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce("title", '') || ' ' || "text")) STORED NOT NULL,
	"embedding" public.vector(1536),
	"created_at" timestamp with time zone DEFAULT (now() at time zone 'utc') NOT NULL,
	CONSTRAINT "source_units_source_unit" UNIQUE("source_kind","source_id","unit_index"),
	CONSTRAINT "source_units_source_kind" CHECK ("source_units"."source_kind" IN ('vault','social','evidence'))
);
--> statement-breakpoint
ALTER TABLE "source_units" ADD CONSTRAINT "source_units_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "source_units_artist" ON "source_units" USING btree ("artist_id","source_kind","source_id");
--> statement-breakpoint
CREATE INDEX "source_units_search" ON "source_units" USING gin ("search");
--> statement-breakpoint
CREATE INDEX "source_units_embedding" ON "source_units" USING hnsw ("embedding" public.vector_cosine_ops);
--> statement-breakpoint
ALTER TABLE "source_units" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "mnweb_select_source_units" ON "source_units" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);
--> statement-breakpoint
CREATE POLICY "mnweb_insert_source_units" ON "source_units" AS PERMISSIVE FOR INSERT TO "mnweb" WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "mnweb_update_source_units" ON "source_units" AS PERMISSIVE FOR UPDATE TO "mnweb" USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "mnweb_delete_source_units" ON "source_units" AS PERMISSIVE FOR DELETE TO "mnweb" USING (true);
--> statement-breakpoint
REVOKE ALL ON public.source_units FROM PUBLIC, anon, authenticated, mnweb;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.source_units TO mnweb;
--> statement-breakpoint
CREATE FUNCTION public.delete_vault_source_units()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  DELETE FROM public.source_units WHERE source_kind = 'vault' AND source_id = OLD.id;
  RETURN OLD;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.delete_vault_source_units() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_vault_source_units() TO mnweb;
--> statement-breakpoint
CREATE TRIGGER delete_vault_source_units AFTER DELETE ON public.artist_vault_sources
  FOR EACH ROW EXECUTE FUNCTION public.delete_vault_source_units();
--> statement-breakpoint
CREATE FUNCTION public.delete_social_post_units()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  DELETE FROM public.source_units WHERE source_kind = 'social' AND source_id = OLD.id;
  RETURN OLD;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.delete_social_post_units() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_social_post_units() TO mnweb;
--> statement-breakpoint
CREATE TRIGGER delete_social_post_units AFTER DELETE ON public.artist_social_posts
  FOR EACH ROW EXECUTE FUNCTION public.delete_social_post_units();
--> statement-breakpoint
CREATE FUNCTION public.delete_research_evidence_units()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  DELETE FROM public.source_units WHERE source_kind = 'evidence' AND source_id = OLD.id;
  RETURN OLD;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.delete_research_evidence_units() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_research_evidence_units() TO mnweb;
--> statement-breakpoint
CREATE TRIGGER delete_research_evidence_units AFTER DELETE ON public.artist_research_evidence
  FOR EACH ROW EXECUTE FUNCTION public.delete_research_evidence_units();
--> statement-breakpoint
ALTER TABLE public.artist_research_jobs DROP CONSTRAINT artist_research_jobs_kind_check;
ALTER TABLE public.artist_research_jobs ADD CONSTRAINT artist_research_jobs_kind_check
 CHECK(kind IN ('social_ingest','caption_extract','lore_refresh','source_search','latest_refresh','source_extract','question_research','spotify_match','interview_prepare','catalog_match','unit_sync'));
COMMIT;
