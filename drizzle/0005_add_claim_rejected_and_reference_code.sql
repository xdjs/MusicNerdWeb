ALTER TYPE "public"."claim_status" ADD VALUE IF NOT EXISTS 'rejected';--> statement-breakpoint
ALTER TABLE "artist_claims" ADD COLUMN IF NOT EXISTS "reference_code" text;