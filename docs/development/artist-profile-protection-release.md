# Artist profile protection release

This change requires configuration **before deployment**. Never restore a database
backup or run bio generation as part of this release.

## Database

Applied `drizzle/0024_artist_profile_protection.sql` on dev on 2026-09-09.
Production is explicitly held pending reviewer green light and release approval.
The migration adds the `inprocess` column/platform configuration,
retires Catalog/Foundation/Sound from `urlmap` (legacy artist values are retained),
and permits `lore_refresh` research jobs. Verify the `mnweb` role's column privileges
and existing research-job RLS policies. The new column alone does not make saved
In Process links display: platform configuration and this app release are required.

The `inprocess` column was already added on dev and production during the scoped
link repair; the migration uses `IF NOT EXISTS`. Remaining statements are now
applied on dev only. The dev schema has no unique index on `urlmap.site_name` and
requires `color_hex`; the migration handles both without broad schema changes.
Verified one In Process configuration row, zero retired platform rows, nullable text
column, updated job-kind constraint, `mnweb` privileges and existing enabled RLS.
Do not run the full migration journal automatically until #1148
is reconciled. The SQL contains no artist-specific updates.

## Storage

Each environment needs its own server-only `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`. Never use production credentials on a preview deployment.
Production has both variables configured; confirm preview configuration separately.

Dev provisioning is complete: `lore-upload-staging` is private with a 10,485,760-byte
limit and the supported MIME allowlist. Production provisioning has not been run.
The provisioning command is recorded for the agent at the approved production gate,
not as a manual task for the PR author/reviewer:

```sh
node scripts/provision-lore-upload-storage.mjs /path/to/environment.env
```

This creates `lore-upload-staging` as **private**, restricted to 10 MiB (the UI's
10 MB/file limit) and supported MIME types. It refuses to change an existing bucket
with incompatible settings. Keep the existing `vault-files` bucket for validated,
approved files. No new public upload policy or browser-exposed service key is needed.

The browser uploads to a server-issued signed URL. Completion rechecks authentication,
artist authorization, signed metadata, size and magic bytes before publishing a source.
Scanned PDFs without readable text are saved with an explicit warning; OCR and complete
document indexing are separate work, not features shipped by this patch.

Completed staging objects are removed. Abandoned/failed uploads remain private;
periodic cleanup of staging objects older than the signed URL lifetime is operational
follow-up. Never clean objects in `vault-files` as part of staging cleanup.

## Verification and rollout

`npx drizzle-kit check` passed after the SQL and schema snapshot corrections.
Direct dev verification connected as `mnweb` (not owner): In Process URL validation
and column write passed; Lore job insert, duplicate-request coalescing and completion
passed. The temporary artist and job were rolled back and absence verified. No real
artist profile was modified by these checks. This does not replace browser/worker tests.
Security advisors report existing public-schema extension and GraphQL discoverability
warnings, plus the intended public artist-read policy; this migration adds no grants or
policies. Broader hardening is separate from this release:
[extension guidance](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public),
[GraphQL guidance](https://supabase.com/docs/guides/database/database-linter?lint=0026_pg_graphql_anon_table_exposed).
The following are application release checks, not outstanding dev database setup:

1. Run type-check, lint, all unit tests, build and `npx drizzle-kit check`.
2. On dev, upload a 10 MiB PDF through the signed flow; reject one byte over.
   Verify an unauthorized user cannot sign or complete another artist's upload.
3. On a test profile, change approved documents and click Look again twice, including
   during the social cooldown. Verify the durable Lore job runs and the UI reloads.
4. Pin a historical bio, regenerate, and refresh. It must stay pinned and unchanged.
   Explicitly unpin before editing; previous versions must remain available.
5. Verify In Process's 0x + 40-hex-character address URLs and retired platform choices.
6. Obtain Codex review for the exact staging PR head. Follow the normal staging-to-main
   release gate; code review approval alone is not a production deployment.

A production PDF-backed knowledge repair was separately authorized and verified with
live Ask requests. It changed only the derived knowledge document/citations, not the
artist row, claims, bio versions or uploaded sources. Its private evidence and recovery
snapshot are not in this public repository. The broader ingestion design is still open.
