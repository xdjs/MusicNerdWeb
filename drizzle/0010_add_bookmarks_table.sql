-- Add bookmarks table
CREATE TABLE IF NOT EXISTS "bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE;

-- Add unique constraint to prevent duplicate bookmarks
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_artist_unique" UNIQUE ("user_id", "artist_id");

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "bookmarks_user_id_idx" ON "bookmarks" ("user_id");
CREATE INDEX IF NOT EXISTS "bookmarks_artist_id_idx" ON "bookmarks" ("artist_id");
CREATE INDEX IF NOT EXISTS "bookmarks_position_idx" ON "bookmarks" ("position");
