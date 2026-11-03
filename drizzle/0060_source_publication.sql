-- Explicit source publication is not an artist claim or an onboarding confirmation.
-- Legacy rows retain their current claim-dependent behavior; no public backfill.
ALTER TABLE public.artist_vault_sources
  ADD COLUMN publication text NOT NULL DEFAULT 'inherit';
--> statement-breakpoint
ALTER TABLE public.artist_vault_sources
  ADD CONSTRAINT artist_vault_sources_publication_check
  CHECK (publication IN ('inherit', 'public', 'private'));
