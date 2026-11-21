-- OAuth storage for the Music Nerd MCP (#1696); additive. Apply before the MusicNerdAPI OAuth server deploys.
-- oauth_clients: one row per registered client. oauth_grants: one row per connection (a member
-- approving a client). oauth_tokens: codes, access and refresh tokens, stored only as SHA-256 hex;
-- deleting a grant deletes its tokens. Refresh tokens have no expiry and last until the grant is deleted.
BEGIN;
SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
CREATE TABLE "oauth_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"redirect_uris" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_clients_name" CHECK (char_length("oauth_clients"."name") BETWEEN 1 AND 200)
);
--> statement-breakpoint
ALTER TABLE "oauth_clients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "oauth_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "oauth_grants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "oauth_tokens" (
	"hash" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"grant_id" uuid NOT NULL,
	"expires_at" timestamp with time zone,
	"used_at" timestamp with time zone,
	"code_challenge" text,
	"redirect_uri" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_tokens_hash" CHECK ("oauth_tokens"."hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "oauth_tokens_kind" CHECK ("oauth_tokens"."kind" IN ('code','access','refresh')),
	CONSTRAINT "oauth_tokens_expiry" CHECK (("oauth_tokens"."kind" = 'refresh') = ("oauth_tokens"."expires_at" IS NULL)),
	CONSTRAINT "oauth_tokens_code" CHECK (("oauth_tokens"."kind" = 'code') = ("oauth_tokens"."code_challenge" IS NOT NULL AND "oauth_tokens"."redirect_uri" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "oauth_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "oauth_grants" ADD CONSTRAINT "oauth_grants_client_id_oauth_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_grants" ADD CONSTRAINT "oauth_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_grant_id_oauth_grants_id_fk" FOREIGN KEY ("grant_id") REFERENCES "public"."oauth_grants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "oauth_grants_user" ON "oauth_grants" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "oauth_grants_client" ON "oauth_grants" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "oauth_tokens_grant" ON "oauth_tokens" USING btree ("grant_id");--> statement-breakpoint
CREATE POLICY "mnweb_select_oauth_clients" ON "oauth_clients" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_insert_oauth_clients" ON "oauth_clients" AS PERMISSIVE FOR INSERT TO "mnweb" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_select_oauth_grants" ON "oauth_grants" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_insert_oauth_grants" ON "oauth_grants" AS PERMISSIVE FOR INSERT TO "mnweb" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_update_oauth_grants" ON "oauth_grants" AS PERMISSIVE FOR UPDATE TO "mnweb" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_delete_oauth_grants" ON "oauth_grants" AS PERMISSIVE FOR DELETE TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_select_oauth_tokens" ON "oauth_tokens" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_insert_oauth_tokens" ON "oauth_tokens" AS PERMISSIVE FOR INSERT TO "mnweb" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_update_oauth_tokens" ON "oauth_tokens" AS PERMISSIVE FOR UPDATE TO "mnweb" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_delete_oauth_tokens" ON "oauth_tokens" AS PERMISSIVE FOR DELETE TO "mnweb" USING (true);
--> statement-breakpoint
REVOKE ALL ON public.oauth_clients, public.oauth_grants, public.oauth_tokens FROM PUBLIC, anon, authenticated, mnweb;
GRANT SELECT, INSERT ON public.oauth_clients TO mnweb;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oauth_grants, public.oauth_tokens TO mnweb;
--> statement-breakpoint
COMMIT;
