-- Run inside the SAME gated release transaction, before 0060 changes source row shape.
-- Caller loads private approved values into pg_temp.about_legacy_manifest with columns:
-- artist_id uuid PRIMARY KEY, claim_id uuid UNIQUE NOT NULL, bio_hash text NOT NULL,
-- pinned_version_id uuid, source_checkpoint_hash text NOT NULL. Never regenerate its hashes.
SET LOCAL timezone='UTC';
SET LOCAL datestyle='ISO, MDY';
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
-- Prevent inserts/deletes as well as edits while full-row checkpoint is verified.
LOCK TABLE public.artists,public.artist_claims,public.artist_bio_versions,public.artist_vault_sources IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
 IF (SELECT count(*) FROM pg_temp.about_legacy_manifest)<>16 THEN RAISE EXCEPTION 'Expected exact approved 16 manifest entries'; END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='artist_vault_sources' AND column_name='publication') THEN
  RAISE EXCEPTION 'Legacy checkpoint must be verified before source schema migration; do not rebaseline'; END IF;
 IF to_regclass('mn_private.artist_bio_provenance') IS NOT NULL OR to_regclass('mn_private.legacy_bio_publications') IS NOT NULL THEN
  RAISE EXCEPTION 'Existing lineage or allowances require explicit reconciliation, never replay activation'; END IF;
 IF EXISTS(
  SELECT 1 FROM pg_temp.about_legacy_manifest e
  LEFT JOIN public.artists a ON a.id=e.artist_id
  LEFT JOIN public.artist_claims c ON c.id=e.claim_id
  WHERE a.id IS NULL OR c.id IS NULL OR c.artist_id IS DISTINCT FROM e.artist_id OR c.status IS DISTINCT FROM 'approved'
   OR encode(sha256(convert_to(a.bio,'UTF8')),'hex') IS DISTINCT FROM e.bio_hash
   OR (SELECT v.id FROM public.artist_bio_versions v WHERE v.artist_id=e.artist_id AND v.is_pinned LIMIT 1) IS DISTINCT FROM e.pinned_version_id
   OR (SELECT count(*) FROM public.artist_bio_versions v WHERE v.artist_id=e.artist_id AND v.is_pinned)>1
   OR encode(sha256(convert_to(coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id)::text FROM public.artist_vault_sources s WHERE s.artist_id=e.artist_id),'[]'),'UTF8')),'hex') IS DISTINCT FROM e.source_checkpoint_hash
 ) THEN RAISE EXCEPTION 'Approved legacy snapshot changed; stop activation for review'; END IF;
END $$;
-- Marks validation in this transaction only; required by the activation step.
CREATE TEMP TABLE about_legacy_validated ON COMMIT DROP AS SELECT * FROM pg_temp.about_legacy_manifest;
