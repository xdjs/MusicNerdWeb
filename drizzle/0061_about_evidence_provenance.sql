-- Private lineage sidecars only. Public artist/history rows and legacy data stay unchanged.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
    AND table_name IN ('artists','artist_bio_versions') AND column_name='bio_provenance')
  THEN RAISE EXCEPTION 'Public provenance columns already exist; explicit migration review required'; END IF;
END $$;
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS mn_private;
--> statement-breakpoint
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
GRANT USAGE ON SCHEMA mn_private TO mnweb;
--> statement-breakpoint
CREATE TABLE mn_private.artist_bio_provenance (
  artist_id uuid PRIMARY KEY CONSTRAINT artist_bio_provenance_artist_id_artists_id_fk REFERENCES public.artists(id) ON DELETE CASCADE,
  provenance jsonb NOT NULL CONSTRAINT artist_bio_provenance_object CHECK (jsonb_typeof(provenance)='object')
);
--> statement-breakpoint
CREATE TABLE mn_private.artist_bio_version_provenance (
  version_id uuid PRIMARY KEY CONSTRAINT artist_bio_version_provenance_version_id_artist_bio_versions_id_fk REFERENCES public.artist_bio_versions(id) ON DELETE CASCADE,
  provenance jsonb NOT NULL CONSTRAINT artist_bio_version_provenance_object CHECK (jsonb_typeof(provenance)='object')
);
--> statement-breakpoint
ALTER TABLE mn_private.artist_bio_provenance ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE mn_private.artist_bio_version_provenance ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY mnweb_artist_bio_provenance ON mn_private.artist_bio_provenance FOR ALL TO mnweb USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY mnweb_artist_bio_version_provenance ON mn_private.artist_bio_version_provenance FOR ALL TO mnweb USING (true) WITH CHECK (true);
--> statement-breakpoint
REVOKE ALL ON TABLE mn_private.artist_bio_provenance, mn_private.artist_bio_version_provenance FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE mn_private.artist_bio_provenance, mn_private.artist_bio_version_provenance TO mnweb;
--> statement-breakpoint
-- Refuse unexpected default/direct grants instead of silently exposing evidence.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace,
      LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) acl
    WHERE n.nspname='mn_private' AND c.relname IN ('artist_bio_provenance','artist_bio_version_provenance')
      AND (acl.grantee NOT IN (c.relowner,(SELECT oid FROM pg_roles WHERE rolname='mnweb'))
        OR (acl.grantee=(SELECT oid FROM pg_roles WHERE rolname='mnweb')
          AND (acl.privilege_type NOT IN ('SELECT','INSERT','UPDATE','DELETE') OR acl.is_grantable)))
  ) THEN RAISE EXCEPTION 'Unexpected provenance schema/table grants; review role access before migration'; END IF;
END $$;
