-- Lock-only access for Lore validation; no activity-event UPDATE grant.
-- Run as the controlled migration owner, never as mnweb.
CREATE FUNCTION mn_private.lock_lore_activity_events(p_artist_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
BEGIN
  PERFORM e.id FROM public.artist_activity_events e
  WHERE e.artist_id = p_artist_id
    AND e.id IN (
      SELECT v.activity_id FROM public.artist_vault_sources v
      WHERE v.artist_id = p_artist_id
    )
  ORDER BY e.id
  FOR SHARE OF e;
END;
$function$;
REVOKE ALL ON FUNCTION mn_private.lock_lore_activity_events(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION mn_private.lock_lore_activity_events(uuid) TO mnweb;

-- Fail closed if migration-owner default privileges introduce other callers.
DO $audit$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p,
      LATERAL pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
    WHERE p.oid = 'mn_private.lock_lore_activity_events(uuid)'::pg_catalog.regprocedure
      AND (a.grantee NOT IN (p.proowner, (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'mnweb'))
        OR (a.grantee <> p.proowner AND a.is_grantable))
  ) THEN
    RAISE EXCEPTION 'Unexpected Lore lock function privileges';
  END IF;
END;
$audit$;
