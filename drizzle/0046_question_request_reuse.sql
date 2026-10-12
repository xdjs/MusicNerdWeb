BEGIN;
SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
CREATE TABLE "artist_question_requests" (
	"artist_id" uuid NOT NULL,
	"request_hash" text NOT NULL,
	"token" uuid NOT NULL,
	"lease_until" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"job_id" uuid,
	"question_hash" text,
	"reusable" boolean DEFAULT false NOT NULL,
	"answer_intent" text,
	"routing" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "artist_question_requests_artist_id_request_hash_pk" PRIMARY KEY("artist_id","request_hash"),
	CONSTRAINT "artist_question_requests_hash" CHECK ("artist_question_requests"."request_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "artist_question_requests_binding" CHECK (("artist_question_requests"."job_id" is null and "artist_question_requests"."question_hash" is null and not "artist_question_requests"."reusable") or ("artist_question_requests"."job_id" is not null and "artist_question_requests"."question_hash" is not null and "artist_question_requests"."question_hash" ~ '^[a-f0-9]{64}$')),
	CONSTRAINT "artist_question_requests_intent" CHECK ("artist_question_requests"."answer_intent" is null or length("artist_question_requests"."answer_intent") between 1 and 500),
	CONSTRAINT "artist_question_requests_routing" CHECK (jsonb_typeof("artist_question_requests"."routing") = 'object' and octet_length("artist_question_requests"."routing"::text)<=16000)
);
--> statement-breakpoint
ALTER TABLE "artist_question_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "artist_question_requests" ADD CONSTRAINT "artist_question_requests_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_question_requests" ADD CONSTRAINT "artist_question_requests_job_id_artist_research_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."artist_research_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artist_question_requests_expiry" ON "artist_question_requests" USING btree ("expires_at");--> statement-breakpoint
CREATE POLICY "mnweb_select_artist_question_requests" ON "artist_question_requests" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_insert_artist_question_requests" ON "artist_question_requests" AS PERMISSIVE FOR INSERT TO "mnweb" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_update_artist_question_requests" ON "artist_question_requests" AS PERMISSIVE FOR UPDATE TO "mnweb" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_delete_artist_question_requests" ON "artist_question_requests" AS PERMISSIVE FOR DELETE TO "mnweb" USING (true);
--> statement-breakpoint
REVOKE ALL ON TABLE artist_question_requests FROM PUBLIC, anon, authenticated, mnweb;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE artist_question_requests TO mnweb;
COMMIT;
