BEGIN;
SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
CREATE TABLE "artist_question_answers" (
	"job_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"question_hash" text NOT NULL,
	"status" text NOT NULL,
	"claim_token" uuid NOT NULL,
	"claim_until" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"result" jsonb,
	"failure_stage" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artist_question_answers_job_id_question_hash_pk" PRIMARY KEY("job_id","question_hash"),
	CONSTRAINT "artist_question_answers_hash" CHECK ("artist_question_answers"."question_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "artist_question_answers_status" CHECK ("artist_question_answers"."status" in ('waiting','drafting','verified','failed')),
	CONSTRAINT "artist_question_answers_attempts" CHECK ("artist_question_answers"."attempts" between 0 and 3),
	CONSTRAINT "artist_question_answers_result" CHECK (("artist_question_answers"."status" = 'verified' and jsonb_typeof("artist_question_answers"."result") = 'object') or ("artist_question_answers"."status" <> 'verified' and "artist_question_answers"."result" is null))
);
--> statement-breakpoint
ALTER TABLE "artist_question_answers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "artist_question_answers" ADD CONSTRAINT "artist_question_answers_job_id_artist_research_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."artist_research_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_question_answers" ADD CONSTRAINT "artist_question_answers_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artist_question_answers_expiry" ON "artist_question_answers" USING btree ("expires_at");--> statement-breakpoint
CREATE POLICY "mnweb_select_artist_question_answers" ON "artist_question_answers" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_insert_artist_question_answers" ON "artist_question_answers" AS PERMISSIVE FOR INSERT TO "mnweb" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_update_artist_question_answers" ON "artist_question_answers" AS PERMISSIVE FOR UPDATE TO "mnweb" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_delete_artist_question_answers" ON "artist_question_answers" AS PERMISSIVE FOR DELETE TO "mnweb" USING (true);
--> statement-breakpoint
REVOKE ALL ON TABLE "artist_question_answers" FROM PUBLIC, anon, authenticated, mnweb;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "artist_question_answers" TO mnweb;
COMMIT;
