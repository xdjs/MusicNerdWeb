-- Additive, nullable lineage only. Do not reconstruct historical evidence.
ALTER TABLE public.artists ADD COLUMN bio_provenance jsonb;
--> statement-breakpoint
ALTER TABLE public.artist_bio_versions ADD COLUMN bio_provenance jsonb;
