# Catalog counterparts and chat recency

Local October 28 follow-up to the stand-up. Owner: Pete. Customers: artists missing catalog links and fans asking about recent activity. Tracking issue publication awaits approval; historical references #1580, #1524 and #1629 retain their original scope.

## Catalog counterpart contract

During existing profile discovery, a known Deezer identity can propose Spotify, and a known Spotify identity can propose Deezer. Name search supplies bounded Deezer candidates; it is not proof. Matching requires at least two distinct exact ISRCs, a unique winning Spotify credit identity, and the resolved artist name. Collaborator ties, incomplete Spotify results and a full five-result Deezer candidate window remain ambiguous. Unavailable or malformed provider responses are provider failures, not empty catalogs. No result within this bounded sample does not prove an artist has no counterpart anywhere in the catalog.

Automatic attachments retain unique Wikidata proof and otherwise recheck the exact recording-corroborated pair. The existing scoped/locked writer rechecks mapping conflicts, saved exclusions, review decisions and source/target catalog values before writing. Explicit artist decisions remain separate. No new scheduler, migration, page-read provider request or production backfill is added. Discovery failures are logged with a distinct outcome; the existing durable Deezer-to-Spotify worker continues its own retry policy. This change does not add a durable reverse-direction retry queue.

## Chat contract

The streaming chat already loads own social posts, public answers and stored provider snapshots. `searchSources` now supports chronological retrieval and platform/evidence constraints through the existing shared selectors; `readSource` and search results expose publication/activity/retrieval dates. Latest mode excludes unknown and future dates. Latest-release requests prioritize dated catalog evidence instead of treating a newer social post as a newer release.

The prompt requires reading and citing the newest relevant stored item, preserves the date, and qualifies saved evidence as incomplete live coverage. Empty/stale results cannot prove no newer activity. No additional model call, database query or provider fetch is added to saved-source retrieval. Model compliance still needs a live chat/eval check; deterministic tool tests are not proof of a production model answer or latency.

## Incident evidence and limits

Public production artist search on October 28 returned Pete Rango's existing Spotify ID and a null Deezer field. The public MCP mapping read retains Deezer 94933462 (medium confidence, name_search, resolved March 30); the public Wikidata pair query returns no bindings. Thus the existing Wikidata-only gate cannot automatically reattach this retained name-only mapping. This establishes a recovery gap, not the original deletion's provenance. The configured local database is a different environment and contains both catalog IDs for a different Pete row. Current API reset code preserves Spotify, Deezer and their mappings; its real PostgreSQL regression passes. The historic production reset that removed the link has not been established, and no production data was changed.
