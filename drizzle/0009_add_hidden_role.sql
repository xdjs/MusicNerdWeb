-- Add isHidden boolean field to users table for hiding users from leaderboards
ALTER TABLE "users" ADD COLUMN "is_hidden" boolean DEFAULT false NOT NULL;
