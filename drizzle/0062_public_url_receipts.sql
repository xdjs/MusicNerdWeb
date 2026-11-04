-- Exact URL policy receipts; no historical backfill and no public read grant.
CREATE TABLE mn_private.public_url_receipts (
  url_hash bytea NOT NULL,
  url text COLLATE "C" NOT NULL,
  policy_version integer NOT NULL,
  CONSTRAINT public_url_receipts_pkey PRIMARY KEY (url_hash, policy_version),
  CONSTRAINT public_url_receipts_hash_length CHECK (octet_length(url_hash)=32),
  CONSTRAINT public_url_receipts_policy_positive CHECK (policy_version > 0)
);
--> statement-breakpoint
ALTER TABLE mn_private.public_url_receipts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY mnweb_public_url_receipts_select ON mn_private.public_url_receipts FOR SELECT TO mnweb USING (true);
--> statement-breakpoint
CREATE POLICY mnweb_public_url_receipts_insert ON mn_private.public_url_receipts FOR INSERT TO mnweb WITH CHECK (true);
--> statement-breakpoint
REVOKE ALL ON TABLE mn_private.public_url_receipts FROM PUBLIC, anon, authenticated, mnweb;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE mn_private.public_url_receipts TO mnweb;
--> statement-breakpoint
-- Fail atomically on unexpected direct/default grants to any other roles.
-- Role membership itself remains a deployment audit, as with migration0061.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_namespace n,
      LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) acl
    WHERE n.nspname='mn_private' AND acl.grantee NOT IN (n.nspowner,(SELECT oid FROM pg_roles WHERE rolname='mnweb'))
  ) OR EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace,
      LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) acl
    WHERE n.nspname='mn_private' AND c.relname='public_url_receipts'
      AND (acl.grantee NOT IN (c.relowner,(SELECT oid FROM pg_roles WHERE rolname='mnweb'))
        OR (acl.grantee=(SELECT oid FROM pg_roles WHERE rolname='mnweb') AND (acl.privilege_type NOT IN ('SELECT','INSERT') OR acl.is_grantable)))
  ) THEN RAISE EXCEPTION 'Unexpected URL receipt grants; review role access before migration'; END IF;
END $$;
