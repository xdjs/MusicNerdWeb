BEGIN;
SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
CREATE TABLE "artist_interview_answer_versions" (
	"answer_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"revision" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"note" text,
	"actor_user_id" uuid,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artist_interview_answer_versions_answer_revision" PRIMARY KEY("answer_id","revision"),
	CONSTRAINT "artist_interview_answer_versions_revision" CHECK ("artist_interview_answer_versions"."revision" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "artist_interview_answer_versions_identity" CHECK (coalesce("artist_interview_answer_versions"."snapshot"->>'id' = "artist_interview_answer_versions"."answer_id"::text AND "artist_interview_answer_versions"."snapshot"->>'artistId' = "artist_interview_answer_versions"."artist_id"::text AND jsonb_typeof("artist_interview_answer_versions"."snapshot"->'answer') = 'string', false)),
	CONSTRAINT "artist_interview_answer_versions_note" CHECK ("artist_interview_answer_versions"."note" IS NULL OR char_length("artist_interview_answer_versions"."note") <= 400)
);
--> statement-breakpoint
ALTER TABLE "artist_interview_answer_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "artist_interview_answer_versions" ADD CONSTRAINT "artist_interview_answer_versions_answer_id_artist_interview_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."artist_interview_answers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_interview_answer_versions" ADD CONSTRAINT "artist_interview_answer_versions_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_interview_answer_versions" ADD CONSTRAINT "artist_interview_answer_versions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artist_interview_answer_versions_artist" ON "artist_interview_answer_versions" USING btree ("artist_id");--> statement-breakpoint
CREATE POLICY "mnweb_select_artist_interview_answer_versions" ON "artist_interview_answer_versions" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_insert_artist_interview_answer_versions" ON "artist_interview_answer_versions" AS PERMISSIVE FOR INSERT TO "mnweb" WITH CHECK (true);
--> statement-breakpoint
REVOKE ALL ON TABLE "artist_interview_answer_versions" FROM PUBLIC, anon, authenticated, mnweb;
GRANT SELECT, INSERT ON TABLE "artist_interview_answer_versions" TO mnweb;
COMMIT;
