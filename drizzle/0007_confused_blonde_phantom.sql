CREATE TABLE "artist_bio_versions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"artist_id" uuid NOT NULL,
	"bio_text" text NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artist_bio_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "artist_vault_sources" ADD COLUMN "og_image" text;--> statement-breakpoint
ALTER TABLE "artist_bio_versions" ADD CONSTRAINT "artist_bio_versions_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_artist_bio_versions_artist_id" ON "artist_bio_versions" USING btree ("artist_id" uuid_ops);--> statement-breakpoint
CREATE POLICY "mnweb_select_artist_bio_versions" ON "artist_bio_versions" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_insert_artist_bio_versions" ON "artist_bio_versions" AS PERMISSIVE FOR INSERT TO "mnweb";--> statement-breakpoint
CREATE POLICY "mnweb_update_artist_bio_versions" ON "artist_bio_versions" AS PERMISSIVE FOR UPDATE TO "mnweb";--> statement-breakpoint
CREATE POLICY "mnweb_delete_artist_bio_versions" ON "artist_bio_versions" AS PERMISSIVE FOR DELETE TO "mnweb" USING (true);