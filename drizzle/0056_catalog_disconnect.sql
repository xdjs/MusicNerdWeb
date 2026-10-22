BEGIN;

-- #1580: new backend capability. Apply only after explicit schema/permission approval.
-- Web owns this migration. No data backfill, exclusion, or general DELETE grant.
-- The DDL owner must be a trusted non-application role. mnweb supplies a Privy-derived
-- actor after API authentication; this is not independent auth.uid()/JWT validation.
DO $$ BEGIN
  IF current_user IN ('mnweb', 'anon', 'authenticated') THEN
    RAISE EXCEPTION 'Catalog disconnect migration requires the trusted DDL owner';
  END IF;
END $$;
--> statement-breakpoint
CREATE SCHEMA musicnerd_private;
--> statement-breakpoint
REVOKE ALL ON SCHEMA musicnerd_private FROM PUBLIC, anon, authenticated, mnweb;
--> statement-breakpoint
GRANT USAGE ON SCHEMA musicnerd_private TO mnweb;
--> statement-breakpoint
CREATE TABLE musicnerd_private.catalog_link_disconnects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  artist_id uuid NOT NULL,
  platform text NOT NULL CHECK (platform IN ('spotify', 'deezer')),
  old_value text NOT NULL CHECK (length(btrim(old_value)) > 0),
  mapping_snapshot jsonb,
  actor_user_id uuid NOT NULL,
  claim_id uuid,
  authorization_mode text NOT NULL CHECK (authorization_mode IN ('owner', 'contributor')),
  disconnected_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT catalog_disconnect_mapping_snapshot CHECK (
    mapping_snapshot IS NULL OR (
      jsonb_typeof(mapping_snapshot) = 'object'
      AND mapping_snapshot->>'artist_id' = artist_id::text
      AND mapping_snapshot->>'platform' = platform
      AND mapping_snapshot->>'platform_id' = old_value
      AND mapping_snapshot->>'id' IS NOT NULL
    )
  )
);
--> statement-breakpoint
-- Identifiers are historical snapshots, deliberately not FKs: revocation/merge
-- must not block on an archive insert or cascade-delete retained provenance.
ALTER TABLE musicnerd_private.catalog_link_disconnects ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE musicnerd_private.catalog_link_disconnects FROM PUBLIC, anon, authenticated, mnweb;
--> statement-breakpoint
CREATE FUNCTION musicnerd_private.disconnect_catalog_link(
  p_artist_id uuid, p_platform text, p_expected_value text, p_expected_mapping jsonb,
  p_actor_user_id uuid, p_expected_claim_id uuid, p_authorization text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  current_value text;
  current_claim_id uuid;
  current_claim_user uuid;
  actor_admin boolean;
  actor_whitelisted boolean;
  mapping_row public.artist_id_mappings%ROWTYPE;
  mapping_json jsonb;
  affected integer;
BEGIN
  IF p_artist_id IS NULL OR p_actor_user_id IS NULL
     OR p_platform IS NULL OR p_platform NOT IN ('spotify', 'deezer')
     OR p_authorization IS NULL OR p_authorization NOT IN ('owner', 'contributor')
     OR (p_expected_value IS NOT NULL AND btrim(p_expected_value) = '') THEN
    RAISE EXCEPTION 'Invalid authenticated catalog disconnect' USING ERRCODE = 'P1581';
  END IF;

  -- Same order and keys as API/Web identity writers. A caller cannot omit locks.
  PERFORM pg_advisory_xact_lock(hashtextextended('musicnerd:artist-platform-slot:' || p_artist_id::text || ':' || p_platform, 0));
  IF p_expected_value IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('musicnerd:artist-platform:' || p_platform || ':' || p_expected_value, 0));
  END IF;
  SELECT CASE WHEN p_platform = 'deezer' THEN a.deezer ELSE a.spotify END
    INTO current_value FROM public.artists a WHERE a.id = p_artist_id FOR UPDATE;
  IF NOT FOUND OR current_value IS DISTINCT FROM p_expected_value THEN
    RAISE EXCEPTION 'Catalog identity changed; refresh before disconnecting' USING ERRCODE = 'P1580';
  END IF;

  -- Do not lock claim after artist: revocation locks/deletes claim before artist.
  SELECT c.id, c.user_id INTO current_claim_id, current_claim_user
    FROM public.artist_claims c WHERE c.artist_id = p_artist_id AND c.status = 'approved';
  IF current_claim_id IS DISTINCT FROM p_expected_claim_id THEN
    RAISE EXCEPTION 'Artist ownership changed' USING ERRCODE = 'P1581';
  END IF;
  SELECT u.is_admin, u.is_white_listed INTO actor_admin, actor_whitelisted
    FROM public.users u WHERE u.id = p_actor_user_id;
  IF NOT FOUND OR NOT (
    coalesce(actor_admin, false)
    OR (p_authorization = 'owner' AND current_claim_user = p_actor_user_id)
    OR (p_authorization = 'contributor' AND coalesce(actor_whitelisted, false))
  ) IS TRUE THEN
    RAISE EXCEPTION 'Not authorized for this catalog disconnect' USING ERRCODE = 'P1581';
  END IF;

  SELECT m.* INTO mapping_row FROM public.artist_id_mappings m
    WHERE m.artist_id = p_artist_id AND m.platform = p_platform FOR UPDATE;
  mapping_json := CASE WHEN FOUND THEN to_jsonb(mapping_row) ELSE NULL END;
  IF mapping_json IS DISTINCT FROM p_expected_mapping
     OR (mapping_json IS NOT NULL AND (current_value IS NULL OR mapping_row.platform_id IS DISTINCT FROM current_value)) THEN
    RAISE EXCEPTION 'Catalog mapping changed or differs from displayed identity; review required' USING ERRCODE = 'P1580';
  END IF;
  IF current_value IS NOT NULL THEN

  INSERT INTO musicnerd_private.catalog_link_disconnects
    (artist_id, platform, old_value, mapping_snapshot, actor_user_id, claim_id, authorization_mode)
    VALUES (p_artist_id, p_platform, current_value, mapping_json, p_actor_user_id, current_claim_id, p_authorization);

  IF mapping_json IS NOT NULL THEN
    DELETE FROM public.artist_id_mappings
      WHERE id = mapping_row.id AND artist_id = p_artist_id AND platform = p_platform
        AND platform_id = current_value;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 1 THEN
      RAISE EXCEPTION 'Catalog mapping changed during disconnect' USING ERRCODE = 'P1580';
    END IF;
  END IF;

  IF p_platform = 'deezer' THEN
    UPDATE public.artists SET deezer = NULL WHERE id = p_artist_id AND deezer = p_expected_value;
  ELSE
    UPDATE public.artists SET spotify = NULL WHERE id = p_artist_id AND spotify = p_expected_value;
  END IF;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Catalog identity changed during disconnect' USING ERRCODE = 'P1580';
  END IF;
  END IF;
  UPDATE public.artist_research_jobs
    SET status = 'done', claimed_at = NULL, updated_at = clock_timestamp(),
      state = state || '{"identityChanged":true,"outcome":"identity_changed"}'::jsonb
    WHERE artist_id = p_artist_id AND kind = 'spotify_match' AND status IN ('pending', 'running');
  RETURN current_value;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION musicnerd_private.disconnect_catalog_link(uuid,text,text,jsonb,uuid,uuid,text) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION musicnerd_private.disconnect_catalog_link(uuid,text,text,jsonb,uuid,uuid,text) TO mnweb;

COMMIT;
