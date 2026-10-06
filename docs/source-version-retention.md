# Source retention migration

Tracks [#1424](https://github.com/xdjs/MusicNerdWeb/issues/1424). The HTTP contract is [MusicNerdDocs#7](https://github.com/xdjs/MusicNerdDocs/pull/7). This schema PR renders no new UI; MusicNerdAPI supplies historical reads in a separate PR.

Migration `0039_source_versions.sql` retains a previous approved Lore body or own social source when its selected evidence/provenance changes. Capture occurs in the updating transaction for both applications. It copies the projection consumed by knowledge reads, including supported transcript fields, not the raw provider payload. Identical evidence, ingestion timestamps and engagement-only refreshes do not add copies. Earlier overwritten content cannot be recovered. No backfill or scraping is required: the current original is captured on its first subsequent change.

The two archive tables have source and artist foreign keys with cascade deletion. `mnweb` receives SELECT/INSERT with RLS policies; it cannot UPDATE/DELETE retained rows directly. Public roles have no archive access. Security-invoker capture functions use a fixed empty search path and explicitly qualified application objects. Existing parent policies/grants stay unchanged. API reads reauthorize the account and current source eligibility; retained rows alone never grant access to rejected or removed material.

Apply this exact forward migration to the verified preview database before testing the API PR. Verify actual `mnweb` capture, duplicate writes, rollback and permission failures; a successful owner SQL query does not prove app access. Do not replay the whole migration journal (#1148). Production application remains a separate release step before the dependent API is promoted.

The migration is transactional and takes a five-second lock timeout. It is not a rerunnable script. On a failed application, inspect transaction outcome before retrying. Rolling the API back does not require dropping these tables or losing retained originals; the previous API ignores them. Do not drop archived data as a routine code rollback.

Focused verification: `npx jest src/server/db/__tests__/sourceVersions.test.ts src/server/db/__tests__/migrationSnapshot.test.ts --runInBand`. PGlite executes the actual migration as SQL, including app-role restrictions; live target checks remain required. `npx drizzle-kit check` verifies the journal. Run the full Web gate before opening the schema PR. This migration changes no interview prompt, queue behavior or public response.
