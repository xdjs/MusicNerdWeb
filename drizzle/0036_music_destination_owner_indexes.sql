-- #1273: exact-expression indexes for public and research identity ownership checks.
-- Additive only: preserve legacy social-lookup indexes and all grants/RLS policies.
-- Apply before the dependent Web/API release; this is not a data backfill.
CREATE INDEX "artists_music_bandcamp_owner_idx" ON "artists" USING btree (lower(ltrim(btrim("bandcamp"), '@')));--> statement-breakpoint
CREATE INDEX "artists_music_subvert_owner_idx" ON "artists" USING btree (lower(ltrim(btrim("subvert"), '@')));--> statement-breakpoint
CREATE INDEX "artists_music_supercollector_owner_idx" ON "artists" USING btree (regexp_replace(lower(ltrim(btrim("supercollector"), '@')), '[.]eth$', ''));--> statement-breakpoint
CREATE INDEX "artists_music_soundcloud_owner_idx" ON "artists" USING btree (lower(ltrim(btrim("soundcloud"), '@')));--> statement-breakpoint
CREATE INDEX "artists_music_audius_owner_idx" ON "artists" USING btree (lower(ltrim(btrim("audius"), '@')));--> statement-breakpoint
CREATE INDEX "artists_music_mixcloud_owner_idx" ON "artists" USING btree (lower(ltrim(btrim("mixcloud"), '@')));
