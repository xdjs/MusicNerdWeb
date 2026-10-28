BEGIN;
-- No data scan/backfill. Install with 0058 before dependent API deployment.
DO $$ BEGIN
 IF current_user IN ('mnweb','anon','authenticated') THEN
   RAISE EXCEPTION 'Catalog scheduling migration requires the trusted DDL owner';
 END IF;
END $$;
--> statement-breakpoint
ALTER TABLE public.artist_research_jobs DROP CONSTRAINT artist_research_jobs_kind_check;
ALTER TABLE public.artist_research_jobs ADD CONSTRAINT artist_research_jobs_kind_check
 CHECK(kind IN ('social_ingest','caption_extract','lore_refresh','source_search','latest_refresh','source_extract','question_research','spotify_match','interview_prepare','catalog_match'));
--> statement-breakpoint
CREATE UNIQUE INDEX artist_research_jobs_catalog_single_worker ON public.artist_research_jobs(kind) WHERE kind='catalog_match' AND status='running';
--> statement-breakpoint
CREATE INDEX artist_research_jobs_catalog_anchor ON public.artist_research_jobs(artist_id,(state->'anchor')) WHERE kind='catalog_match';
--> statement-breakpoint
CREATE FUNCTION musicnerd_private.queue_catalog_counterpart(p_artist_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE a public.artists%ROWTYPE; anchor jsonb; target text;
BEGIN
 SELECT * INTO a FROM public.artists WHERE id=p_artist_id FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 anchor := jsonb_build_object('name',a.name,'spotify',a.spotify,'deezer',a.deezer);
 -- An identity edit invalidates an old lease, even if the new pair is complete.
 UPDATE public.artist_research_jobs SET status='done',claimed_at=NULL,updated_at=clock_timestamp(),
   state=state || '{"outcome":"identity_changed"}'::jsonb
 WHERE artist_id=a.id AND kind='catalog_match' AND status IN ('pending','running')
   AND state->'anchor' IS DISTINCT FROM anchor;
 IF nullif(a.spotify,'') IS NOT NULL AND nullif(a.deezer,'') IS NOT NULL THEN RETURN false; END IF;
 IF nullif(btrim(a.name),'') IS NULL OR length(a.name)>500
   OR (a.spotify IS NOT NULL AND a.spotify !~ '^[A-Za-z0-9]{22}$')
   OR (a.deezer IS NOT NULL AND a.deezer !~ '^[1-9][0-9]*$') THEN RETURN false; END IF;
 target := CASE WHEN a.spotify IS NULL THEN 'spotify' ELSE 'deezer' END;
 IF EXISTS(SELECT 1 FROM musicnerd_private.catalog_link_disconnects WHERE artist_id=a.id AND (platform=target OR (a.spotify IS NULL AND a.deezer IS NULL AND platform IN ('spotify','deezer')))) THEN
   UPDATE public.artist_research_jobs SET status='done',claimed_at=NULL,updated_at=clock_timestamp(),
     state=state || '{"outcome":"user_disconnected"}'::jsonb
   WHERE artist_id=a.id AND kind='catalog_match' AND status IN ('pending','running');
   RETURN false;
 END IF;
 -- Terminal ambiguous/no-match/failure results are evidence, not instructions to loop.
 IF EXISTS(SELECT 1 FROM public.artist_research_jobs WHERE artist_id=a.id AND kind='catalog_match' AND state->'anchor'=anchor AND state->>'outcome' IS DISTINCT FROM 'identity_changed') THEN RETURN false; END IF;
 INSERT INTO public.artist_research_jobs(artist_id,kind,status,state)
 VALUES(a.id,'catalog_match','pending',jsonb_build_object('version',1,'anchor',anchor,
   'expiresAtMs',floor(extract(epoch FROM (clock_timestamp()+interval '7 days'))*1000)))
 ON CONFLICT (artist_id,kind) WHERE status IN ('pending','running') DO NOTHING;
 RETURN FOUND;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION musicnerd_private.queue_catalog_counterpart(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION musicnerd_private.queue_catalog_counterpart(uuid) TO mnweb;
--> statement-breakpoint
CREATE FUNCTION musicnerd_private.queue_catalog_counterpart_after_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 PERFORM musicnerd_private.queue_catalog_counterpart(NEW.id);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION musicnerd_private.queue_catalog_counterpart_after_write() FROM PUBLIC,anon,authenticated,mnweb;
--> statement-breakpoint
-- All write paths share this hook, including Web creation and API enrichment/reset.
-- Idempotent snapshot checks prevent unrelated updates from replaying provider work.
CREATE TRIGGER artists_catalog_counterpart AFTER INSERT OR UPDATE ON public.artists
 FOR EACH ROW EXECUTE FUNCTION musicnerd_private.queue_catalog_counterpart_after_write();
--> statement-breakpoint
-- Preserve old malformed rows for review, but reject new malformed catalog values.
CREATE FUNCTION musicnerd_private.validate_catalog_identity_write()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='INSERT' OR NEW.spotify IS DISTINCT FROM OLD.spotify THEN
   IF NEW.spotify IS NOT NULL AND NEW.spotify !~ '^[A-Za-z0-9]{22}$' THEN
     RAISE EXCEPTION 'Invalid Spotify artist ID' USING ERRCODE='23514';
   END IF;
 END IF;
 IF TG_OP='INSERT' OR NEW.deezer IS DISTINCT FROM OLD.deezer THEN
   IF NEW.deezer IS NOT NULL AND NEW.deezer !~ '^[1-9][0-9]*$' THEN
     RAISE EXCEPTION 'Invalid Deezer artist ID' USING ERRCODE='23514';
   END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION musicnerd_private.validate_catalog_identity_write() FROM PUBLIC,anon,authenticated,mnweb;
CREATE TRIGGER artists_validate_catalog_identity BEFORE INSERT OR UPDATE OF spotify,deezer ON public.artists
 FOR EACH ROW EXECUTE FUNCTION musicnerd_private.validate_catalog_identity_write();
--> statement-breakpoint
-- Exclusion writers must serialize with the final artist-row identity fence.
-- This covers older API/MCP clients without changing their authorization contract.
CREATE FUNCTION musicnerd_private.lock_catalog_exclusion_artist()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='DELETE' THEN
   PERFORM id FROM public.artists WHERE id=OLD.artist_id FOR UPDATE;
   RETURN OLD;
 ELSIF TG_OP='UPDATE' THEN
   PERFORM id FROM public.artists WHERE id IN (OLD.artist_id,NEW.artist_id) ORDER BY id FOR UPDATE;
 ELSE
   PERFORM id FROM public.artists WHERE id=NEW.artist_id FOR UPDATE;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION musicnerd_private.lock_catalog_exclusion_artist() FROM PUBLIC,anon,authenticated,mnweb;
CREATE TRIGGER catalog_exclusion_artist_fence BEFORE INSERT OR UPDATE OR DELETE ON public.artist_mapping_exclusions
 FOR EACH ROW EXECUTE FUNCTION musicnerd_private.lock_catalog_exclusion_artist();
COMMIT;
