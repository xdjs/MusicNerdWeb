CREATE TABLE public.artist_bio_corrections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.users(id),
 reason text NOT NULL,
 details text NOT NULL,
 source_url text,
 bio_snapshot text NOT NULL,
 status text NOT NULL DEFAULT 'pending',
 created_at timestamptz NOT NULL DEFAULT now(),
 reviewed_at timestamptz,
 reviewed_by uuid REFERENCES public.users(id),
 CONSTRAINT artist_bio_corrections_reason CHECK (reason IN ('wrong_artist','incorrect','outdated','other')),
 CONSTRAINT artist_bio_corrections_status CHECK (status IN ('pending','resolved','dismissed')),
 CONSTRAINT artist_bio_corrections_bounds CHECK (length(details) <= 2000 AND length(bio_snapshot) BETWEEN 1 AND 12000 AND (source_url IS NULL OR length(source_url) <= 2048)),
 CONSTRAINT artist_bio_corrections_review CHECK ((status = 'pending' AND reviewed_at IS NULL AND reviewed_by IS NULL) OR (status <> 'pending' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX artist_bio_corrections_user_created ON public.artist_bio_corrections(user_id, created_at);
--> statement-breakpoint
CREATE INDEX artist_bio_corrections_status_created ON public.artist_bio_corrections(status, created_at);
--> statement-breakpoint
ALTER TABLE public.artist_bio_corrections ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY mnweb_bio_corrections ON public.artist_bio_corrections FOR ALL TO mnweb USING (true) WITH CHECK (true);
--> statement-breakpoint
REVOKE ALL ON public.artist_bio_corrections FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON public.artist_bio_corrections TO mnweb;
