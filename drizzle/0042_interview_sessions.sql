BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE "artist_interview_question_evidence" (
	"answer_id" uuid PRIMARY KEY NOT NULL,
	"artist_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"memory_snapshot_id" text NOT NULL,
	"evidence_references" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artist_interview_evidence_ordinal" UNIQUE("session_id","ordinal"),
	CONSTRAINT "artist_interview_evidence_valid" CHECK ("artist_interview_question_evidence"."ordinal" between 1 and 3 AND "artist_interview_question_evidence"."memory_snapshot_id" ~ '^[a-f0-9]{64}$' AND jsonb_typeof("artist_interview_question_evidence"."evidence_references") = 'array' AND jsonb_array_length("artist_interview_question_evidence"."evidence_references") between 1 and 3 AND char_length("artist_interview_question_evidence"."evidence_references"::text) <= 16000)
);
--> statement-breakpoint
ALTER TABLE "artist_interview_question_evidence" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "artist_interview_sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"artist_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"sitting" integer NOT NULL,
	"state" text DEFAULT 'active' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "artist_interview_sessions_request" UNIQUE("artist_id","request_id"),
	CONSTRAINT "artist_interview_sessions_sitting" UNIQUE("artist_id","sitting"),
	CONSTRAINT "artist_interview_sessions_identity" UNIQUE("id","artist_id"),
	CONSTRAINT "artist_interview_sessions_state" CHECK ("artist_interview_sessions"."sitting" > 0 AND (("artist_interview_sessions"."state" = 'active' AND "artist_interview_sessions"."closed_at" IS NULL) OR ("artist_interview_sessions"."state" = 'finished' AND "artist_interview_sessions"."closed_at" IS NOT NULL)))
);
--> statement-breakpoint
ALTER TABLE "artist_interview_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "artist_interview_question_evidence" ADD CONSTRAINT "artist_interview_question_evidence_answer_id_artist_interview_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."artist_interview_answers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_interview_question_evidence" ADD CONSTRAINT "artist_interview_question_evidence_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_interview_question_evidence" ADD CONSTRAINT "interview_evidence_session_artist" FOREIGN KEY ("session_id","artist_id") REFERENCES "public"."artist_interview_sessions"("id","artist_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_interview_sessions" ADD CONSTRAINT "artist_interview_sessions_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_interview_sessions" ADD CONSTRAINT "artist_interview_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artist_interview_evidence_artist" ON "artist_interview_question_evidence" USING btree ("artist_id");--> statement-breakpoint
CREATE UNIQUE INDEX "artist_interview_sessions_active" ON "artist_interview_sessions" USING btree ("artist_id") WHERE "artist_interview_sessions"."state" = 'active';--> statement-breakpoint
CREATE INDEX "artist_interview_sessions_creator" ON "artist_interview_sessions" USING btree ("created_by");--> statement-breakpoint
CREATE POLICY "mnweb_read_interview_evidence" ON "artist_interview_question_evidence" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_create_interview_evidence" ON "artist_interview_question_evidence" AS PERMISSIVE FOR INSERT TO "mnweb" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_read_interview_sessions" ON "artist_interview_sessions" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_create_interview_sessions" ON "artist_interview_sessions" AS PERMISSIVE FOR INSERT TO "mnweb" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_close_interview_sessions" ON "artist_interview_sessions" AS PERMISSIVE FOR UPDATE TO "mnweb" USING (true) WITH CHECK (true);

REVOKE ALL ON public.artist_interview_sessions, public.artist_interview_question_evidence FROM PUBLIC, anon, authenticated, mnweb;
GRANT SELECT, INSERT ON public.artist_interview_sessions, public.artist_interview_question_evidence TO mnweb;
GRANT UPDATE(state, closed_at) ON public.artist_interview_sessions TO mnweb;
COMMIT;
