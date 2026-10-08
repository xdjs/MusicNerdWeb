BEGIN;

CREATE TABLE "artist_interview_boundaries" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"artist_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"wording" text NOT NULL,
	"scope" text NOT NULL,
	"sitting" integer NOT NULL,
	"origin_answer_id" uuid,
	"origin_question_key" text NOT NULL,
	"origin_question" text NOT NULL,
	"created_by" uuid,
	"activity_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retracted_at" timestamp with time zone,
	"retracted_by" uuid,
	"retraction_activity_id" uuid,
	CONSTRAINT "artist_interview_boundaries_request" UNIQUE("artist_id","request_id"),
	CONSTRAINT "artist_interview_boundaries_scope" CHECK ("artist_interview_boundaries"."scope" in ('sitting','until_retracted') AND "artist_interview_boundaries"."sitting" > 0),
	CONSTRAINT "artist_interview_boundaries_wording" CHECK (char_length(btrim("artist_interview_boundaries"."wording")) > 0 AND char_length("artist_interview_boundaries"."wording") <= 4000 AND char_length("artist_interview_boundaries"."origin_question_key") between 1 and 500 AND char_length("artist_interview_boundaries"."origin_question") between 1 and 8000)
);
--> statement-breakpoint
ALTER TABLE "artist_interview_boundaries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "artist_interview_boundaries" ADD CONSTRAINT "artist_interview_boundaries_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_interview_boundaries" ADD CONSTRAINT "artist_interview_boundaries_origin_answer_id_artist_interview_answers_id_fk" FOREIGN KEY ("origin_answer_id") REFERENCES "public"."artist_interview_answers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_interview_boundaries" ADD CONSTRAINT "artist_interview_boundaries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_interview_boundaries" ADD CONSTRAINT "artist_interview_boundaries_activity_id_artist_activity_events_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."artist_activity_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_interview_boundaries" ADD CONSTRAINT "artist_interview_boundaries_retracted_by_users_id_fk" FOREIGN KEY ("retracted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_interview_boundaries" ADD CONSTRAINT "artist_interview_boundaries_retraction_activity_id_artist_activity_events_id_fk" FOREIGN KEY ("retraction_activity_id") REFERENCES "public"."artist_activity_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artist_interview_boundaries_active" ON "artist_interview_boundaries" USING btree ("artist_id","sitting") WHERE "artist_interview_boundaries"."retracted_at" is null;--> statement-breakpoint
CREATE INDEX "artist_interview_boundaries_origin" ON "artist_interview_boundaries" USING btree ("origin_answer_id");--> statement-breakpoint
CREATE INDEX "artist_interview_boundaries_creator" ON "artist_interview_boundaries" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "artist_interview_boundaries_retractor" ON "artist_interview_boundaries" USING btree ("retracted_by");--> statement-breakpoint
CREATE INDEX "artist_interview_boundaries_activity" ON "artist_interview_boundaries" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "artist_interview_boundaries_retraction_activity" ON "artist_interview_boundaries" USING btree ("retraction_activity_id");--> statement-breakpoint
CREATE POLICY "mnweb_select_artist_interview_boundaries" ON "artist_interview_boundaries" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_insert_artist_interview_boundaries" ON "artist_interview_boundaries" AS PERMISSIVE FOR INSERT TO "mnweb" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_retract_artist_interview_boundaries" ON "artist_interview_boundaries" AS PERMISSIVE FOR UPDATE TO "mnweb" USING (true) WITH CHECK (true);

-- Boundaries are server-only; exact wording and origin are immutable to the app role.
REVOKE ALL ON public.artist_interview_boundaries FROM PUBLIC, anon, authenticated, mnweb;
GRANT SELECT, INSERT ON public.artist_interview_boundaries TO mnweb;
GRANT UPDATE(retracted_at, retracted_by, retraction_activity_id) ON public.artist_interview_boundaries TO mnweb;
COMMIT;
