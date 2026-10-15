CREATE TABLE "artist_onboarding_interview_plans" (
	"artist_id" uuid PRIMARY KEY NOT NULL,
	"claim_id" uuid,
	"questions" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artist_onboarding_interview_plans_questions" CHECK (jsonb_typeof("artist_onboarding_interview_plans"."questions") = 'array' and jsonb_array_length("artist_onboarding_interview_plans"."questions") between 1 and 3)
);
--> statement-breakpoint
ALTER TABLE "artist_onboarding_interview_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "artist_onboarding_interview_plans" ADD CONSTRAINT "artist_onboarding_interview_plans_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_onboarding_interview_plans" ADD CONSTRAINT "artist_onboarding_interview_plans_claim_id_artist_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."artist_claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "mnweb_onboarding_interview_plans" ON "artist_onboarding_interview_plans" AS PERMISSIVE FOR ALL TO "mnweb" USING (true) WITH CHECK (true);
--> statement-breakpoint
REVOKE ALL ON TABLE "artist_onboarding_interview_plans" FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "artist_onboarding_interview_plans" TO mnweb;
