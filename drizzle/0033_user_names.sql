-- Public names are independent of login credentials. Legacy private identifiers
-- are excluded until the release backfill assigns a generated public name.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username_needs_confirmation boolean NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username_prompted_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS users_public_username_unique
ON public.users (lower(btrim(username)))
WHERE nullif(btrim(username), '') IS NOT NULL
  AND username !~ '[^[:space:]@]+@[^[:space:]@]+'
  AND lower(btrim(username)) IS DISTINCT FROM lower(btrim(wallet));
-- Existing table-level mnweb SELECT/UPDATE grants apply to these columns.
-- No policies or browser-role grants change.
