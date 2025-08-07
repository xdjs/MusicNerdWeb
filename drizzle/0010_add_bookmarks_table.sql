-- Add bookmarks table to migrate from localStorage to database storage
-- This allows users to store their bookmarked artists with proper user association

BEGIN;

-- Create the bookmarks table
CREATE TABLE IF NOT EXISTS "bookmarks" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
    "user_id" uuid NOT NULL,
    "artist_id" uuid NOT NULL,
    "artist_name" text NOT NULL,
    "image_url" text,
    "order_index" integer NOT NULL DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_artist_id_fkey" 
    FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE;

-- Add unique constraint to prevent duplicate bookmarks per user
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_artist_unique" 
    UNIQUE ("user_id", "artist_id");

-- Add indexes for performance
CREATE INDEX "bookmarks_user_id_idx" ON "bookmarks" ("user_id");
CREATE INDEX "bookmarks_user_order_idx" ON "bookmarks" ("user_id", "order_index");
CREATE INDEX "bookmarks_created_at_idx" ON "bookmarks" ("created_at");

-- Add a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_bookmarks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = (now() AT TIME ZONE 'utc'::text);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on row changes
CREATE TRIGGER update_bookmarks_updated_at_trigger
    BEFORE UPDATE ON "bookmarks"
    FOR EACH ROW
    EXECUTE FUNCTION update_bookmarks_updated_at();

COMMIT;
