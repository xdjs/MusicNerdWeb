CREATE TABLE "artist_self_edits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"site_name" text NOT NULL,
	"old_value" text,
	"new_value" text NOT NULL,
	"submitted_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "artist_self_edits_changed" CHECK ("artist_self_edits"."old_value" IS DISTINCT FROM "artist_self_edits"."new_value"),
	CONSTRAINT "artist_self_edits_nonempty" CHECK (length("artist_self_edits"."new_value") > 0)
);
--> statement-breakpoint
ALTER TABLE "artist_self_edits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "artist_self_edits" ADD CONSTRAINT "artist_self_edits_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_self_edits" ADD CONSTRAINT "artist_self_edits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artist_self_edits_user_time_idx" ON "artist_self_edits" USING btree ("user_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "artist_self_edits_time_idx" ON "artist_self_edits" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE POLICY "mnweb_select_artist_self_edits" ON "artist_self_edits" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_insert_artist_self_edits" ON "artist_self_edits" AS PERMISSIVE FOR INSERT TO "mnweb" WITH CHECK (true);
--> statement-breakpoint
-- Server-only data: account isolation is enforced by authenticated application queries.
REVOKE ALL ON TABLE "artist_self_edits" FROM PUBLIC, anon, authenticated, mnweb;
GRANT SELECT, INSERT ON TABLE "artist_self_edits" TO mnweb;
