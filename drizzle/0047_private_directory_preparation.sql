CREATE TABLE "artist_directory_preparations" (
	"artist_id" uuid PRIMARY KEY NOT NULL,
	"activity_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"status" text NOT NULL,
	"document" text,
	"about" text,
	"starting_bio" text,
	"manifest" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artist_directory_preparations_status" CHECK ("artist_directory_preparations"."status" in ('ready','insufficient')),
	CONSTRAINT "artist_directory_preparations_ready" CHECK ("artist_directory_preparations"."status" <> 'ready' or ("artist_directory_preparations"."document" is not null and "artist_directory_preparations"."about" is not null))
);
--> statement-breakpoint
ALTER TABLE "artist_directory_preparations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "artist_source_assessments" (
	"source_id" uuid PRIMARY KEY NOT NULL,
	"artist_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"snapshot" jsonb NOT NULL,
	"assessed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artist_source_assessments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "artist_directory_preparations" ADD CONSTRAINT "artist_directory_preparations_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_directory_preparations" ADD CONSTRAINT "artist_directory_preparations_activity_id_artist_activity_events_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."artist_activity_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_directory_preparations" ADD CONSTRAINT "artist_directory_preparations_job_id_artist_research_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."artist_research_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_source_assessments" ADD CONSTRAINT "artist_source_assessments_source_id_artist_vault_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."artist_vault_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_source_assessments" ADD CONSTRAINT "artist_source_assessments_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_source_assessments" ADD CONSTRAINT "artist_source_assessments_activity_id_artist_activity_events_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."artist_activity_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artist_source_assessments_artist" ON "artist_source_assessments" USING btree ("artist_id");--> statement-breakpoint
CREATE POLICY "mnweb_directory_preparations" ON "artist_directory_preparations" AS PERMISSIVE FOR ALL TO "mnweb" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_source_assessments" ON "artist_source_assessments" AS PERMISSIVE FOR ALL TO "mnweb" USING (true) WITH CHECK (true);--> statement-breakpoint
REVOKE ALL ON TABLE public.artist_directory_preparations, public.artist_source_assessments FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.artist_directory_preparations, public.artist_source_assessments TO mnweb;
