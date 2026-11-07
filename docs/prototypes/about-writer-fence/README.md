# #1655 paired About writer fence

Local candidate only. No deployment, production SQL, or grant change is authorized.
Migration 0065 adds a BEFORE UPDATE OF bio trigger requiring transaction-local
`musicnerd.about_writer_version=1655-v1` for changed text (including clearing text).
It does not modify rows, table grants, RLS, or existing schema objects. The new
function has no PUBLIC EXECUTE grant and uses pg_catalog search_path. It is not
SECURITY DEFINER. Its trigger needs no new runtime privileges.

Compatible Web writers call markAboutWriter immediately before their artist.bio
UPDATE inside the existing transaction: persistArtistBio, pinBioVersion, and
revokeApprovedClaim's clear path. API must include persistArtistBio and resetClaimBuild.
Authorization, row locking, evidence and source receipts remain unchanged. The
marker is a compatibility signal, not an authorization secret; the app role can
set custom settings. Never accept it from HTTP input or set it at session scope.

Rollout: marker code is safe before 0065 because custom settings need no migration.
Prepare and validate both compatible artifacts first. Activate 0065 only in the
reviewed paired cutover, with the existing exact-16 preflight/locks. Old transactions
already holding write locks must finish before DDL can activate; abort on snapshot
drift. Queued old workflows reaching changed publication after activation fail
with SQLSTATE55000 and their publication transaction rolls back. This does not
stop model calls or retries; obsolete workflow handling remains a release decision.

Precommit rollback restores prior trigger/function state. Postcommit prefer
compatible application rollback/rollforward while retaining 0065 and provenance.
Dropping the trigger/function would restore the late-write risk and is not the
normal rollback. No grant rollback or data restoration is required or appropriate.
The journal and snapshot advance together; trigger-only SQL does not change the
Drizzle table snapshot shape.

Scope limits: UPDATEs that leave bio unchanged pass. INSERT, standalone history
and source/Lore mutations are not fenced. New readers still validate evidence
against source changes; old raw readers remain a separate cutover requirement.
This fence does not make old deployments safe readers or authorize blanket gating.

Verification: focused Jest/PGlite tests exercise real save, pin and revocation
transactions. The native script uses an owned, socket-only disposable PG17 cluster
and runs the same transaction tests as restricted mnweb, including a DDL denial.
The fixture derives columns from schema but does not reproduce all production RLS
or indexes; paired API native migration tests provide additional coverage.

Run only with preinstalled PG17/Node24, no application environment files:

```sh
MN_APPROVED_SYNTHETIC_PG17=yes PG17_BIN=/absolute/pg17/bin NODE24_BIN=/absolute/node24 \
  bash docs/prototypes/about-writer-fence/run-native.sh
```

Local validation on this candidate: 39 focused Jest/PGlite tests plus 3 revocation
cleanup tests pass; native PostgreSQL17.11 runs 13 transaction tests as mnweb and
verifies owner-only DDL is denied. TypeScript, Drizzle snapshot/journal check and
changed-file lint pass (pre-existing unused-import warnings remain). Native data
is synthetic; this does not establish hosted provider behavior or production RLS.
