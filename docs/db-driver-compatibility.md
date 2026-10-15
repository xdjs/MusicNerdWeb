# Transaction-pool driver compatibility

The application uses `pg` with pipelining explicitly disabled, at most three
connections per warm instance, a 20-second idle timeout and a 10-second connection
timeout. `SUPABASE_DB_CONNECTION` selects the existing endpoint; no pool mode,
credentials, TLS options, grants or schema change accompanies this patch.

Supabase's [postgres.js guidance](https://supabase.com/docs/guides/database/postgres-js)
warns that shared transaction pooling plus pipelining can hang or mismatch query
results even with `prepare:false`. The artist page mixes unparameterized URL-map
reads with parameterized approved/pending source reads. A loopback wire probe of
postgres.js 3.4.9 with the application's options observed two queries outstanding
on one connection for a mixed batch, and six for unparameterized reads. The same
mixed batch using pg 8.23.1 with `pipeline:false` had one. All returned correct data
on plain PostgreSQL: this demonstrates the transport difference, **not a local
reproduction or confirmed root cause of the production pooler hang**.

`createDatabase` keeps existing raw `db.execute` and `tx.execute` row-array
contracts. Drizzle's relational/query-builder mappings are unchanged. Transactions
and nested savepoints use one reserved client. The wrapper owns the top-level
checkout because Drizzle 0.44 starts BEGIN before its own release-finally; even a
failed BEGIN must release capacity. Failed transactions discard their connection.
Checked-out clients have a temporary error listener because pg-pool's pool-level
listener only covers idle clients. A socket error is retained for discard/rejection,
and the temporary listener is removed after release restores pool ownership.
Normal application queries use unnamed statements. Do not add named prepared
statements without checking compatibility with the selected transaction pool.

## Local verification

Create an isolated PostgreSQL cluster whose directory basename is
`local-pg-incident`, bound to loopback on an unused port. These checks never accept
a deployed connection string. The integration check creates and removes its own
synthetic database; it does not verify production grants, real login or real data.

```
MUSICNERD_TEST_PG_PORT=55439 node scripts/verify-driver-pipeline-local.mjs
MUSICNERD_TEST_PG_PORT=55439 npm run test:smoke -- --runInBand driver.smoke
npm run ci
```

The opt-in integration suite covers repeated actual approved/pending source
readers for three fixture artists, mixed parallel reads, source content and data
types, raw rows, commit/rollback/savepoints, the actual owner/admin authorization
guard and stranger rejection, error recovery, and failed-BEGIN checkout cleanup.
Actual local socket failures during BEGIN and an in-flight transaction must reject
without an unhandled client error, discard exactly once, and leave the pool usable.
It skips without `MUSICNERD_TEST_PG_PORT`; ordinary CI does not establish this
integration result. Artist-page unit tests check owner/admin pending sources and
attribution. Search and session-refresh component tests mock the router; they do
not establish real browser navigation or authenticated production recovery.

## Rollout evidence still required

Use the existing release workflow. Verify the exact commit against the selected
transaction endpoint with affected artists and authorized owner/admin sessions,
including direct reload and search navigation. A feature preview with staging
data and uninspected connection settings is not a controlled production comparison.
Do not declare the incident resolved from SELECT 1, unit tests or this local probe.
Do not switch back to the capped session endpoint or bypass protected production
approval. PR #1522's public-read mitigation remains independently scoped.
