ALTER TABLE "artists" ADD COLUMN "header_image_position" jsonb;
--> statement-breakpoint
GRANT SELECT (header_image_position), UPDATE (header_image_position) ON TABLE "artists" TO mnweb;
