-- SAME transaction as legacy-about-preflight.sql, after reviewed 0060–0064 and
-- approved client/grant cutover. No COMMIT here; all postflight checks must pass first.
DO $$ BEGIN
 IF (SELECT count(*) FROM pg_temp.about_legacy_validated)<>16 OR EXISTS(SELECT 1 FROM mn_private.legacy_bio_publications) THEN
  RAISE EXCEPTION 'Missing validation or prior activation; refuse replay'; END IF;
END $$;
INSERT INTO mn_private.legacy_bio_publications(artist_id,claim_id,bio_hash)
 SELECT artist_id,claim_id,bio_hash FROM pg_temp.about_legacy_validated;
