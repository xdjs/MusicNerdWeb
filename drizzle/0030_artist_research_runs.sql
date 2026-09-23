-- Research runs (#1347, docs/research-runs.md).
--
-- One row per execution of artist research: which of the five triggers started it, who, how it
-- ended, and every step it took as one AI SDK UIMessage in `message`, overwritten after each
-- step. Until now the database kept only what survived a run (vault sources, handle columns);
-- every decision in between existed only as a runtime log line, which is how both #1273
-- reproductions had to be read. `artist_vault_sources.run_id` records which run found a source.
--
-- Grants: the app role reads, inserts and updates runs. No DELETE: a run is history, removed
-- only with its artist through the ON DELETE CASCADE below (referential actions run as the
-- table owner, so mnweb needs no DELETE grant for that). The role-wide policies match every
-- other app table; the run page authorizes the viewer (the artist's editors) in application
-- code, per docs/development.md.

CREATE TABLE "artist_research_runs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"artist_id" uuid NOT NULL,
	"trigger" text NOT NULL,
	"triggered_by" uuid,
	"status" text DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
	"finished_at" timestamp with time zone,
	"searches" integer DEFAULT 0 NOT NULL,
	"results" integer DEFAULT 0 NOT NULL,
	"sources_saved" integer DEFAULT 0 NOT NULL,
	"links_saved" integer DEFAULT 0 NOT NULL,
	"rejected" integer DEFAULT 0 NOT NULL,
	"message" jsonb DEFAULT '{"role": "assistant", "parts": []}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
	CONSTRAINT "artist_research_runs_trigger_check" CHECK ("artist_research_runs"."trigger" IN ('claim_approval', 'onboarding_build', 'onboarding_step', 'lore_search', 'about_generation')),
	CONSTRAINT "artist_research_runs_status_check" CHECK ("artist_research_runs"."status" IN ('running', 'completed', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "artist_research_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "artist_vault_sources" ADD COLUMN "run_id" uuid;--> statement-breakpoint
ALTER TABLE "artist_research_runs" ADD CONSTRAINT "artist_research_runs_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_research_runs" ADD CONSTRAINT "artist_research_runs_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_artist_research_runs_artist_started" ON "artist_research_runs" USING btree ("artist_id" uuid_ops,"started_at" DESC NULLS FIRST);--> statement-breakpoint
ALTER TABLE "artist_vault_sources" ADD CONSTRAINT "artist_vault_sources_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."artist_research_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_artist_vault_sources_run_id" ON "artist_vault_sources" USING btree ("run_id" uuid_ops);--> statement-breakpoint
CREATE POLICY "mnweb_select_artist_research_runs" ON "artist_research_runs" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_insert_artist_research_runs" ON "artist_research_runs" AS PERMISSIVE FOR INSERT TO "mnweb" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_update_artist_research_runs" ON "artist_research_runs" AS PERMISSIVE FOR UPDATE TO "mnweb" USING (true) WITH CHECK (true);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "artist_research_runs" TO mnweb;--> statement-breakpoint
GRANT SELECT (run_id), INSERT (run_id), UPDATE (run_id) ON TABLE "artist_vault_sources" TO mnweb;
