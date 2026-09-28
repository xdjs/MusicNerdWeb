CREATE TABLE "instagram_refresh_reservations" (
	"job_id" uuid PRIMARY KEY NOT NULL,
	"artist_id" uuid NOT NULL,
	"reserved_cents" integer NOT NULL,
	"reserved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"run_id" text,
	CONSTRAINT "instagram_refresh_positive_reservation" CHECK ("instagram_refresh_reservations"."reserved_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "instagram_refresh_reservations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "instagram_refresh_reserved_at" ON "instagram_refresh_reservations" USING btree ("reserved_at");--> statement-breakpoint
CREATE INDEX "instagram_refresh_artist_reserved_at" ON "instagram_refresh_reservations" USING btree ("artist_id","reserved_at");--> statement-breakpoint
CREATE POLICY "mnweb_select_instagram_refresh" ON "instagram_refresh_reservations" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_insert_instagram_refresh" ON "instagram_refresh_reservations" AS PERMISSIVE FOR INSERT TO "mnweb" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_update_instagram_refresh" ON "instagram_refresh_reservations" AS PERMISSIVE FOR UPDATE TO "mnweb" USING (true) WITH CHECK (true);
--> statement-breakpoint
REVOKE ALL ON instagram_refresh_reservations FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT ON instagram_refresh_reservations TO mnweb;
--> statement-breakpoint
GRANT UPDATE (started_at, run_id) ON instagram_refresh_reservations TO mnweb;
