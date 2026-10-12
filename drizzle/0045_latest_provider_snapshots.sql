BEGIN;
SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
CREATE TABLE "artist_latest_provider_snapshots" (
	"artist_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"account_id" text NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"checked_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	CONSTRAINT "artist_latest_provider_snapshots_artist_id_provider_pk" PRIMARY KEY("artist_id","provider"),
	CONSTRAINT "artist_latest_provider_snapshots_provider" CHECK ("artist_latest_provider_snapshots"."provider" in ('spotify','deezer','inprocess')),
	CONSTRAINT "artist_latest_provider_snapshots_account" CHECK (length("artist_latest_provider_snapshots"."account_id") between 1 and 2048),
	CONSTRAINT "artist_latest_provider_snapshots_status" CHECK ("artist_latest_provider_snapshots"."status" in ('checked','failed')),
	CONSTRAINT "artist_latest_provider_snapshots_items" CHECK (jsonb_typeof("artist_latest_provider_snapshots"."items") = 'array' and jsonb_array_length("artist_latest_provider_snapshots"."items") <= 50 and octet_length("artist_latest_provider_snapshots"."items"::text) <= 400000)
);
--> statement-breakpoint
ALTER TABLE "artist_latest_provider_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "artist_latest_provider_snapshots" ADD CONSTRAINT "artist_latest_provider_snapshots_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "mnweb_select_artist_latest_provider_snapshots" ON "artist_latest_provider_snapshots" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_insert_artist_latest_provider_snapshots" ON "artist_latest_provider_snapshots" AS PERMISSIVE FOR INSERT TO "mnweb" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_update_artist_latest_provider_snapshots" ON "artist_latest_provider_snapshots" AS PERMISSIVE FOR UPDATE TO "mnweb" USING (true) WITH CHECK (true);
--> statement-breakpoint
REVOKE ALL ON TABLE artist_latest_provider_snapshots FROM PUBLIC, anon, authenticated, mnweb;
GRANT SELECT, INSERT, UPDATE ON TABLE artist_latest_provider_snapshots TO mnweb;
COMMIT;
