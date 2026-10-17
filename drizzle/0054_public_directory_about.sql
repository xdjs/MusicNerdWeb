-- Explicit opt-in: existing private drafts remain ineligible. No public table grant.
ALTER TABLE public.artist_directory_preparations ADD COLUMN public_about jsonb;
