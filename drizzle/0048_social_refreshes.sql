CREATE TABLE "artist_social_refreshes" (
	"artist_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"account_handle" text NOT NULL,
	"scope" text DEFAULT 'profile' NOT NULL,
	"covered_through" timestamp with time zone,
	"checked_at" timestamp with time zone NOT NULL,
	"scan_started_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"item_count" integer NOT NULL,
	"run_id" text NOT NULL,
	CONSTRAINT "artist_social_refreshes_artist_id_platform_account_handle_scope_pk" PRIMARY KEY("artist_id","platform","account_handle","scope"),
	CONSTRAINT "artist_social_refreshes_platform" CHECK ("artist_social_refreshes"."platform" in ('instagram','tiktok','x')),
	CONSTRAINT "artist_social_refreshes_handle" CHECK ("artist_social_refreshes"."account_handle" ~ '^[a-z0-9_.]{1,64}$'),
	CONSTRAINT "artist_social_refreshes_status" CHECK ("artist_social_refreshes"."status" in ('complete','limited')),
	CONSTRAINT "artist_social_refreshes_complete" CHECK ("artist_social_refreshes"."status" <> 'complete' or "artist_social_refreshes"."covered_through" is not null),
	CONSTRAINT "artist_social_refreshes_scope" CHECK ("artist_social_refreshes"."scope" in ('latest','profile') and ("artist_social_refreshes"."scope" <> 'latest' or "artist_social_refreshes"."platform" = 'instagram')),
	CONSTRAINT "artist_social_refreshes_count" CHECK ("artist_social_refreshes"."item_count" >= 0),
	CONSTRAINT "artist_social_refreshes_run" CHECK (length(btrim("artist_social_refreshes"."run_id")) > 0),
	CONSTRAINT "artist_social_refreshes_dates" CHECK ("artist_social_refreshes"."checked_at" >= "artist_social_refreshes"."scan_started_at" and ("artist_social_refreshes"."covered_through" is null or "artist_social_refreshes"."covered_through" <= "artist_social_refreshes"."scan_started_at"))
);
--> statement-breakpoint
ALTER TABLE "artist_social_refreshes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "artist_social_refreshes" ADD CONSTRAINT "artist_social_refreshes_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "mnweb_select_artist_social_refreshes" ON "artist_social_refreshes" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_insert_artist_social_refreshes" ON "artist_social_refreshes" AS PERMISSIVE FOR INSERT TO "mnweb" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_update_artist_social_refreshes" ON "artist_social_refreshes" AS PERMISSIVE FOR UPDATE TO "mnweb" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_delete_artist_social_refreshes" ON "artist_social_refreshes" AS PERMISSIVE FOR DELETE TO "mnweb" USING (true);--> statement-breakpoint
REVOKE ALL ON TABLE public.artist_social_refreshes FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.artist_social_refreshes TO mnweb;
