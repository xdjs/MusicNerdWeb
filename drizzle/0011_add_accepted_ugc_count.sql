-- Add acceptedUgcCount column to users table
ALTER TABLE "users" ADD COLUMN "accepted_ugc_count" BIGINT;
