BEGIN;
SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
-- #1595 P5: both tables are orphaned (no Web or API reader or writer). Dropping a table
-- drops its RLS policies, indexes and sequence. No CASCADE: production has no views,
-- functions, triggers or foreign keys that depend on them, so anything unexpected fails
-- the migration instead of being dropped with it.
DROP TABLE IF EXISTS "funfacts";
--> statement-breakpoint
DROP TABLE IF EXISTS "user_artist_bookmarks";
--> statement-breakpoint
COMMIT;
