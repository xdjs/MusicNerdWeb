CREATE TYPE "public"."claim_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."source_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "artist_claims" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"status" "claim_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
	CONSTRAINT "artist_claims_artist_id_key" UNIQUE("artist_id")
);
--> statement-breakpoint
ALTER TABLE "artist_claims" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "artist_vault_sources" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"artist_id" uuid NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"snippet" text,
	"type" text,
	"status" "source_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artist_vault_sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "legacy_link_dismissed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "artist_claims" ADD CONSTRAINT "artist_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_claims" ADD CONSTRAINT "artist_claims_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_vault_sources" ADD CONSTRAINT "artist_vault_sources_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_artist_claims_user_id" ON "artist_claims" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_artist_claims_artist_id" ON "artist_claims" USING btree ("artist_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_artist_vault_sources_artist_id" ON "artist_vault_sources" USING btree ("artist_id" uuid_ops);--> statement-breakpoint
CREATE POLICY "mnweb_delete_artist_claims" ON "artist_claims" AS PERMISSIVE FOR DELETE TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_insert_artist_claims" ON "artist_claims" AS PERMISSIVE FOR INSERT TO "mnweb";--> statement-breakpoint
CREATE POLICY "mnweb_select_artist_claims" ON "artist_claims" AS PERMISSIVE FOR SELECT TO "mnweb";--> statement-breakpoint
CREATE POLICY "mnweb_update_artist_claims" ON "artist_claims" AS PERMISSIVE FOR UPDATE TO "mnweb";--> statement-breakpoint
CREATE POLICY "mnweb_delete_artist_vault_sources" ON "artist_vault_sources" AS PERMISSIVE FOR DELETE TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_insert_artist_vault_sources" ON "artist_vault_sources" AS PERMISSIVE FOR INSERT TO "mnweb";--> statement-breakpoint
CREATE POLICY "mnweb_select_artist_vault_sources" ON "artist_vault_sources" AS PERMISSIVE FOR SELECT TO "mnweb";--> statement-breakpoint
CREATE POLICY "mnweb_update_artist_vault_sources" ON "artist_vault_sources" AS PERMISSIVE FOR UPDATE TO "mnweb";