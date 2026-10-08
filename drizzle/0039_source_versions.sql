-- Prospective evidence retention; apply before the dependent API release.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE "artist_social_post_versions" (
	"source_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"fingerprint" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artist_social_post_versions_source_id_fingerprint_pk" PRIMARY KEY("source_id","fingerprint"),
	CONSTRAINT "artist_social_post_versions_fingerprint" CHECK ("artist_social_post_versions"."fingerprint" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "artist_social_post_versions_identity" CHECK (coalesce("artist_social_post_versions"."snapshot"->>'id' = "artist_social_post_versions"."source_id"::text
        AND "artist_social_post_versions"."snapshot"->>'artistId' = "artist_social_post_versions"."artist_id"::text
        AND "artist_social_post_versions"."snapshot"->>'kind' = 'social' AND "artist_social_post_versions"."snapshot"->>'version' = '1', false))
);
--> statement-breakpoint
ALTER TABLE "artist_social_post_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "artist_vault_source_versions" (
	"source_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"fingerprint" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artist_vault_source_versions_source_id_fingerprint_pk" PRIMARY KEY("source_id","fingerprint"),
	CONSTRAINT "artist_vault_source_versions_fingerprint" CHECK ("artist_vault_source_versions"."fingerprint" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "artist_vault_source_versions_identity" CHECK (coalesce("artist_vault_source_versions"."snapshot"->>'id' = "artist_vault_source_versions"."source_id"::text
        AND "artist_vault_source_versions"."snapshot"->>'artistId' = "artist_vault_source_versions"."artist_id"::text
        AND "artist_vault_source_versions"."snapshot"->>'kind' = 'vault' AND "artist_vault_source_versions"."snapshot"->>'version' = '1', false))
);
--> statement-breakpoint
ALTER TABLE "artist_vault_source_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "artist_social_post_versions" ADD CONSTRAINT "artist_social_post_versions_source_id_artist_social_posts_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."artist_social_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_social_post_versions" ADD CONSTRAINT "artist_social_post_versions_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_vault_source_versions" ADD CONSTRAINT "artist_vault_source_versions_source_id_artist_vault_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."artist_vault_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_vault_source_versions" ADD CONSTRAINT "artist_vault_source_versions_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artist_social_post_versions_artist" ON "artist_social_post_versions" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "artist_vault_source_versions_artist" ON "artist_vault_source_versions" USING btree ("artist_id");--> statement-breakpoint
CREATE POLICY "mnweb_select_artist_social_post_versions" ON "artist_social_post_versions" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_insert_artist_social_post_versions" ON "artist_social_post_versions" AS PERMISSIVE FOR INSERT TO "mnweb" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "mnweb_select_artist_vault_source_versions" ON "artist_vault_source_versions" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);--> statement-breakpoint
CREATE POLICY "mnweb_insert_artist_vault_source_versions" ON "artist_vault_source_versions" AS PERMISSIVE FOR INSERT TO "mnweb" WITH CHECK (true);

-- No browser/Data API access. Individual authorization remains in server code.
REVOKE ALL ON public.artist_vault_source_versions, public.artist_social_post_versions FROM PUBLIC, anon, authenticated, mnweb;
GRANT SELECT, INSERT ON public.artist_vault_source_versions, public.artist_social_post_versions TO mnweb;

CREATE FUNCTION public.knowledge_vault_source_snapshot(r public.artist_vault_sources)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'version', 1, 'kind', 'vault', 'id', r.id, 'artistId', r.artist_id,
    'status', r.status, 'origin', r.origin, 'type', r.type, 'filePath', r.file_path,
    'url', r.url, 'title', r.title, 'snippet', r.snippet,
    'extractedText', r.extracted_text, 'publishedAt', r.published_at,
    'createdAt', to_char(r.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'updatedAt', to_char(r.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
  );
$$;

CREATE FUNCTION public.knowledge_social_post_snapshot(r public.artist_social_posts)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'version', 1, 'kind', 'social', 'id', r.id, 'artistId', r.artist_id,
    'platform', r.platform, 'ownerUsername', r.owner_username, 'isOwnPost', r.is_own_post,
    'caption', r.caption, 'url', r.url,
    'postedAt', to_char(r.posted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'isRepost', r.raw->'isRepost', 'isRetweet', r.raw->'isRetweet',
    'transcript', jsonb_build_object(
      'version', r.raw->'_musicnerdTranscript'->'version',
      'actor', r.raw->'_musicnerdTranscript'->'actor',
      'text', r.raw->'_musicnerdTranscript'->'text',
      'fetchedAt', r.raw->'_musicnerdTranscript'->'fetchedAt'
    )
  );
$$;

-- This internal deduplication fingerprint is not the public knowledge revision.
-- The API recomputes and verifies the unchanged citation revision format.
CREATE FUNCTION public.knowledge_source_fingerprint(snapshot jsonb)
RETURNS text LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT encode(sha256(convert_to(
    ((snapshot - ARRAY['createdAt','updatedAt']) #- '{transcript,fetchedAt}')::text,
    'UTF8'
  )), 'hex');
$$;

CREATE FUNCTION public.retain_vault_source_version()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE previous_snapshot jsonb;
DECLARE previous_fingerprint text;
BEGIN
  IF OLD.status = 'approved' THEN
    previous_snapshot := public.knowledge_vault_source_snapshot(OLD);
    previous_fingerprint := public.knowledge_source_fingerprint(previous_snapshot);
    IF previous_fingerprint IS DISTINCT FROM public.knowledge_source_fingerprint(public.knowledge_vault_source_snapshot(NEW)) THEN
      INSERT INTO public.artist_vault_source_versions (source_id, artist_id, fingerprint, snapshot)
      VALUES (OLD.id, OLD.artist_id, previous_fingerprint, previous_snapshot)
      ON CONFLICT (source_id, fingerprint) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.retain_social_post_version()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE previous_snapshot jsonb;
DECLARE previous_fingerprint text;
BEGIN
  IF OLD.is_own_post AND OLD.raw->'isRepost' IS DISTINCT FROM 'true'::jsonb
      AND OLD.raw->'isRetweet' IS DISTINCT FROM 'true'::jsonb THEN
    previous_snapshot := public.knowledge_social_post_snapshot(OLD);
    previous_fingerprint := public.knowledge_source_fingerprint(previous_snapshot);
    IF previous_fingerprint IS DISTINCT FROM public.knowledge_source_fingerprint(public.knowledge_social_post_snapshot(NEW)) THEN
      INSERT INTO public.artist_social_post_versions (source_id, artist_id, fingerprint, snapshot)
      VALUES (OLD.id, OLD.artist_id, previous_fingerprint, previous_snapshot)
      ON CONFLICT (source_id, fingerprint) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.knowledge_vault_source_snapshot(public.artist_vault_sources),
  public.knowledge_social_post_snapshot(public.artist_social_posts), public.knowledge_source_fingerprint(jsonb),
  public.retain_vault_source_version(), public.retain_social_post_version()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.knowledge_vault_source_snapshot(public.artist_vault_sources),
  public.knowledge_social_post_snapshot(public.artist_social_posts), public.knowledge_source_fingerprint(jsonb),
  public.retain_vault_source_version(), public.retain_social_post_version() TO mnweb;

CREATE TRIGGER retain_vault_source_version AFTER UPDATE ON public.artist_vault_sources
  FOR EACH ROW EXECUTE FUNCTION public.retain_vault_source_version();
CREATE TRIGGER retain_social_post_version AFTER UPDATE ON public.artist_social_posts
  FOR EACH ROW EXECUTE FUNCTION public.retain_social_post_version();

COMMIT;
