-- Refs MusicNerdWeb#1655: reject late changed About writes from old deployments.
-- Install only during the reviewed paired API/Web cutover.
-- Compatibility marker, not authorization: the app role can set this GUC.
CREATE FUNCTION mn_private.require_about_writer_version() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF NEW.bio IS DISTINCT FROM OLD.bio
     AND current_setting('musicnerd.about_writer_version', true) IS DISTINCT FROM '1655-v1'
  THEN
    RAISE EXCEPTION 'About writer is outdated; retry on the current deployment'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION mn_private.require_about_writer_version() FROM PUBLIC;
CREATE TRIGGER require_about_writer_version
BEFORE UPDATE OF bio ON public.artists
FOR EACH ROW EXECUTE FUNCTION mn_private.require_about_writer_version();
