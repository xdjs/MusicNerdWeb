CREATE TABLE "user_artist_bookmarks" (
	"user_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_artist_bookmarks_pkey" PRIMARY KEY("user_id","artist_id"),
	CONSTRAINT "user_artist_bookmarks_position_nonnegative" CHECK ("user_artist_bookmarks"."position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "user_artist_bookmarks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_artist_bookmarks" ADD CONSTRAINT "user_artist_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_artist_bookmarks" ADD CONSTRAINT "user_artist_bookmarks_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_artist_bookmarks_user_order_idx" ON "user_artist_bookmarks" USING btree ("user_id","position");--> statement-breakpoint
CREATE INDEX "user_artist_bookmarks_artist_idx" ON "user_artist_bookmarks" USING btree ("artist_id");--> statement-breakpoint
CREATE POLICY "mnweb_reassign_artist_self_edits" ON "artist_self_edits" AS PERMISSIVE FOR UPDATE TO "mnweb" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_select_user_artist_bookmarks" ON "user_artist_bookmarks" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_insert_user_artist_bookmarks" ON "user_artist_bookmarks" AS PERMISSIVE FOR INSERT TO "mnweb" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_update_user_artist_bookmarks" ON "user_artist_bookmarks" AS PERMISSIVE FOR UPDATE TO "mnweb" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_delete_user_artist_bookmarks" ON "user_artist_bookmarks" AS PERMISSIVE FOR DELETE TO "mnweb" USING (true);
--> statement-breakpoint
REVOKE ALL ON TABLE "user_artist_bookmarks" FROM PUBLIC, anon, authenticated, mnweb;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "user_artist_bookmarks" TO mnweb;
-- Only ownership may change during the authenticated account-merge transaction.
GRANT UPDATE (user_id) ON TABLE "artist_self_edits" TO mnweb;
