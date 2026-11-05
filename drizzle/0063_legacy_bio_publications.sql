-- USAGE is shared with existing publishing/moderation callers. It grants no
-- access to the new About objects; only their ACLs are changed below.
DO $$ BEGIN
 IF current_user IN ('mnweb','anon','authenticated') OR NOT EXISTS (
  SELECT 1 FROM pg_namespace WHERE nspname='mn_private'
   AND nspowner=(SELECT oid FROM pg_roles WHERE rolname=current_user)
 ) OR EXISTS (
  SELECT 1 FROM pg_roles r JOIN pg_namespace n ON n.nspname='mn_private'
  WHERE NOT r.rolsuper AND r.oid<>n.nspowner
   AND (has_schema_privilege(r.oid,n.oid,'CREATE')
    OR pg_has_role(r.oid,n.nspowner,'MEMBER')
    OR (r.rolname<>'mnweb' AND pg_has_role(r.oid,'mnweb','MEMBER')))
 ) THEN RAISE EXCEPTION 'Unsafe private schema owner, CREATE privilege or app role membership'; END IF;
END $$;
--> statement-breakpoint
-- Explicit exact-snapshot exceptions only. This migration does not seed any rows.
CREATE TABLE mn_private.legacy_bio_publications (
 artist_id uuid PRIMARY KEY CONSTRAINT legacy_bio_publications_artist_id_artists_id_fk REFERENCES public.artists(id) ON DELETE CASCADE,
 claim_id uuid NOT NULL CONSTRAINT legacy_bio_publications_claim_id_artist_claims_id_fk REFERENCES public.artist_claims(id) ON DELETE CASCADE,
 bio_hash text NOT NULL,
 CONSTRAINT legacy_bio_publications_hash CHECK (bio_hash ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
ALTER TABLE mn_private.legacy_bio_publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY mnweb_legacy_bio_publications_select ON mn_private.legacy_bio_publications FOR SELECT TO mnweb USING (true);
REVOKE ALL ON mn_private.legacy_bio_publications FROM PUBLIC, anon, authenticated, mnweb;
GRANT SELECT ON mn_private.legacy_bio_publications TO mnweb;
--> statement-breakpoint
-- Do not acquire artist/claim/source locks here: callers already hold their write
-- locks. Deleting only the leaf allowance avoids reversing their lock order.
-- Triggers consume permanently within the mutation transaction; rollback restores
-- both the original data and allowance. No application role can recreate a row.
CREATE FUNCTION mn_private.consume_legacy_bio_publication() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
 IF TG_TABLE_NAME = 'artists' THEN
  IF OLD.bio IS DISTINCT FROM NEW.bio THEN
   DELETE FROM mn_private.legacy_bio_publications WHERE artist_id=OLD.id;
  END IF;
 ELSIF TG_TABLE_NAME = 'artist_claims' THEN
  IF TG_OP = 'DELETE' THEN
   DELETE FROM mn_private.legacy_bio_publications WHERE claim_id=OLD.id;
  ELSIF OLD.status IS DISTINCT FROM NEW.status OR OLD.user_id IS DISTINCT FROM NEW.user_id OR OLD.artist_id IS DISTINCT FROM NEW.artist_id THEN
   DELETE FROM mn_private.legacy_bio_publications WHERE claim_id=OLD.id;
  END IF;
 ELSIF TG_TABLE_NAME = 'artist_bio_provenance' THEN
  IF TG_OP <> 'INSERT' THEN
   DELETE FROM mn_private.legacy_bio_publications WHERE artist_id=OLD.artist_id;
  END IF;
  IF TG_OP <> 'DELETE' THEN
   DELETE FROM mn_private.legacy_bio_publications WHERE artist_id=NEW.artist_id;
  END IF;
 ELSIF TG_TABLE_NAME = 'artist_vault_sources' THEN
  IF OLD.status='approved' AND OLD.publication <> 'private' THEN
   IF TG_OP='DELETE' THEN
    DELETE FROM mn_private.legacy_bio_publications WHERE artist_id=OLD.artist_id;
   ELSIF NEW.status <> 'approved' OR NEW.publication='private' OR OLD.artist_id IS DISTINCT FROM NEW.artist_id THEN
    DELETE FROM mn_private.legacy_bio_publications WHERE artist_id=OLD.artist_id;
   END IF;
  END IF;
 END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION mn_private.consume_legacy_bio_publication() FROM PUBLIC, anon, authenticated, mnweb;
--> statement-breakpoint
CREATE TRIGGER consume_legacy_bio_provenance AFTER INSERT OR UPDATE OR DELETE ON mn_private.artist_bio_provenance FOR EACH ROW EXECUTE FUNCTION mn_private.consume_legacy_bio_publication();
CREATE TRIGGER consume_legacy_bio_text AFTER UPDATE OF bio ON public.artists FOR EACH ROW EXECUTE FUNCTION mn_private.consume_legacy_bio_publication();
CREATE TRIGGER consume_legacy_bio_claim AFTER UPDATE OR DELETE ON public.artist_claims FOR EACH ROW EXECUTE FUNCTION mn_private.consume_legacy_bio_publication();
CREATE TRIGGER consume_legacy_bio_source AFTER UPDATE OR DELETE ON public.artist_vault_sources FOR EACH ROW EXECUTE FUNCTION mn_private.consume_legacy_bio_publication();
--> statement-breakpoint
DO $$ BEGIN
 IF EXISTS (
  SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace,
  LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) acl
  WHERE n.nspname='mn_private' AND c.relname='legacy_bio_publications'
  AND (acl.grantee NOT IN (c.relowner,(SELECT oid FROM pg_roles WHERE rolname='mnweb'))
   OR (acl.grantee=(SELECT oid FROM pg_roles WHERE rolname='mnweb') AND (acl.privilege_type <> 'SELECT' OR acl.is_grantable)))
 ) OR EXISTS (
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace,
  LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
  WHERE n.nspname='mn_private' AND p.proname='consume_legacy_bio_publication'
  AND acl.grantee <> p.proowner
 ) THEN RAISE EXCEPTION 'Unexpected legacy publication grants'; END IF;
END $$;
