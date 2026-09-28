# Lore provenance and activity

Tracking: [#1371](https://github.com/xdjs/MusicNerdWeb/issues/1371). Pair with the About containment fix [#1372](https://github.com/xdjs/MusicNerdWeb/pull/1372) before release.

## Contract

Source origin is `submission`, `upload`, `research`, or `unknown`. The source points to an immutable `artist_activity_events` record with the initiating user ID, trigger, action and time. Sources inserted before attribution was introduced remain unknown; current ownership and insertion time are not evidence of who submitted them. Deduplication never replaces the original attribution. The user ID comes from server authentication or the durable initiating event, never the request body.

Activity records describe requests or committed changes, not a claim that all research completed. They store no prompts, extracted page text or provider responses. A worker's queued job carries `activity_id` outside mutable progress state; child jobs inherit it. Repeated/coalesced Lore refresh requests have their own records while the running job keeps its original initiator. The worker does not become the initiating user. Existing jobs without provenance remain unknown.

Recorded boundaries: visitor Lore suggestions, editor/onboarding source additions, uploads, explicit source searches, onboarding profile discovery, queued social research and Lore refreshes, and committed About edits/generation. Trigger labels distinguish onboarding, editor search, manual refresh, source changes, upload, claim approval and maintenance. This is not a replacement for the deferred detailed research-run log (#1347): rejected search candidates and step-by-step model output remain out of scope.

Admin Lore review shows source origin, account identity when recorded, trigger, Added time and current claim state. Search matches artist, source or contributor. Origin and claim filters combine with search; pagination preserves them. A separate Activity section lists attributable research/content actions with actor and artist search. Both use bounded server queries after a live admin check. The public source object carries only an event ID, never private actor fields; only Admin joins users.

## Migration and release

Migration SQL and Drizzle journal ship together. The audit table enables RLS, revokes browser-role access, and grants only SELECT/INSERT to mnweb; server application checks provide user authorization. Source and job attribution columns are nullable for existing data. Apply and verify the migration as the app role before deploying dependent code. The About-only PR has no migration dependency.
