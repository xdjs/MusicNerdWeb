BEGIN;

-- Local draft: apply separately with explicit migration approval before deploying dependent API code.
-- Read only the existing private archive; expose no IDs, actors, mappings or timestamps.
DO $$ BEGIN
  IF current_user IN ('mnweb', 'anon', 'authenticated') THEN
    RAISE EXCEPTION 'Catalog recovery migration requires the trusted DDL owner';
  END IF;
END $$;
--> statement-breakpoint
CREATE FUNCTION musicnerd_private.catalog_link_was_disconnected(p_artist_id uuid, p_platform text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF p_artist_id IS NULL OR p_platform IS NULL OR p_platform NOT IN ('spotify', 'deezer') THEN
    RAISE EXCEPTION 'Invalid catalog identity scope' USING ERRCODE = '22023';
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM musicnerd_private.catalog_link_disconnects
    WHERE artist_id = p_artist_id AND platform = p_platform
  );
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION musicnerd_private.catalog_link_was_disconnected(uuid,text) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION musicnerd_private.catalog_link_was_disconnected(uuid,text) TO mnweb;

COMMIT;
