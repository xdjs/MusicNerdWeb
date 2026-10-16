-- This release takes 0049 before deferred Spotify matching (draft Web #1528).
-- That draft must rebase and regenerate its migration before it is merged.
BEGIN;
SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
CREATE TABLE "question_planning_admissions" (
	"visitor_key" text NOT NULL,
	"admitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_planning_admissions_key" CHECK ("question_planning_admissions"."visitor_key" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
ALTER TABLE "question_planning_admissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "question_planning_admissions_visitor_time" ON "question_planning_admissions" USING btree ("visitor_key","admitted_at");--> statement-breakpoint
CREATE INDEX "question_planning_admissions_time" ON "question_planning_admissions" USING btree ("admitted_at");--> statement-breakpoint
CREATE POLICY "mnweb_select_question_planning_admissions" ON "question_planning_admissions" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_insert_question_planning_admissions" ON "question_planning_admissions" AS PERMISSIVE FOR INSERT TO "mnweb" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_delete_question_planning_admissions" ON "question_planning_admissions" AS PERMISSIVE FOR DELETE TO "mnweb" USING (true);
--> statement-breakpoint
REVOKE ALL ON TABLE "question_planning_admissions" FROM PUBLIC, anon, authenticated, service_role, mnweb;
GRANT SELECT, INSERT, DELETE ON TABLE "question_planning_admissions" TO mnweb;
COMMIT;
