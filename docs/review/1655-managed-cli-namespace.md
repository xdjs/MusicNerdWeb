# Managed CLI namespace compatibility — local preparation

Refs #1655. No hosted migration, permission change, deployment or publication.

The migration preflight previously rejected the provider-managed CLI role's
non-inherited SET ROLE membership in the controlled `postgres` schema owner.
The exception in 0061–0063 accepts only the audited `cli_login_postgres` identity:
LOGIN, NOINHERIT, no superuser/create-role/create-database/replication/BYPASSRLS,
connection limit -1, and exactly one membership in the `postgres` schema owner.
That membership must have ADMIN false, INHERIT false, SET true and the verified
`supabase_admin` grantor with its exact audited operator flags. No role may be a
member of the CLI role, and the CLI role must have no effective schema CREATE.
The migration must run as `postgres`. An existing CLI role with any drift fails
closed, including drift to SUPERUSER; it cannot pass the generic superuser filter.

This is recognition of an existing trusted operator, not a new access grant.
The operator retains its existing ability to SET ROLE to postgres and read raw
data. Matching catalog shape detects drift; the provider attribution was separately
verified by the release investigation. It is not inferred from the name alone.
The upstream provider documents the temporary managed CLI identity at
https://supabase.com/kb/troubleshooting/permission-denied-when-deleting-the-cli_login_postgres-role.
No general exception is added for other members, application roles or operators.
Existing object ACL, unexpected-default-grant and schema-owner checks remain.

Tests first reproduced the old guard rejecting the exact managed fixture.
The 36-case namespace/activation suite then passed on PGlite and fresh native
PostgreSQL 17. The new cases include attribute, grantor and membership-option
spoofing; extra outgoing and incoming membership; direct schema CREATE; and
unchanged namespace ACL and role membership on success. Native tests use a new
socket-only disposable cluster, with no hosted credentials or provider calls.
The first native fixture lacked database CREATE for its synthetic migration
operator; the fixture was corrected before the passing rerun.

Integration must copy/checksum these migrations into the API test fixtures and
use the same exact CLI predicate in the target cutover audit. Do not replay
already-applied historical Dev migrations or rewrite their ledger hashes.
Production execution and any shared permission changes remain separately gated.
