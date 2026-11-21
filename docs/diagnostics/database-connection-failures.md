# Database connection diagnostic contract (#1676)

This patch adds evidence, not a timeout fix. It does not change pool size, timeout,
credentials, endpoints, retries, SQL, authentication, or transaction ownership.

The existing process-local pool installs one idle listener and one connect wrapper
at creation. Development reuse retains them. Both callback acquisition (including
`pool.query`) and promise acquisition report a failure then preserve the original
error and successful client/release values. Transaction cleanup remains owned by
`createDatabase`; diagnostics never release a client. A logging failure cannot
replace a driver rejection or escape the idle handler.

Each error record has a fixed event (`database_idle_connection_error` or
`database_acquisition_error`), an allowlisted error code (otherwise `unknown`),
and local total/idle/waiting pool counts. Acquisition records also have
`poolAtStart`, sampled immediately before calling the driver. No error message,
stack, cause, host, connection string, SQL, parameters, or user data is serialized.

A full local pool at acquisition start and a subsequent failure can identify
local contention as a candidate; an empty start is materially different evidence.
Snapshots are not a queue-duration measurement or proof that a request stayed in
a queue. Concurrent activity can change counts. Exact uncoded driver messages are classified as `pool_wait_timeout`,
`connection_timeout`, or `pool_ended`; other uncoded errors remain `unknown`.
Allowlisted codes use `coded_connection_error`. These labels are observations, not
root-cause determinations. Counts are per-process, not provider-wide connection counts.
Neither absence of logs nor an allowlisted code establishes cause or recovery.
Query failures after successful checkout are outside this narrow boundary.

Error records also include nonnegative integer `poolAgeMs` (since diagnostic
installation at pool creation) and `processAgeMs` (Node process uptime). Acquisition
errors add `acquisitionElapsedMs`, measured with a monotonic clock from immediately
before `connect` to failure observation. Invalid clock values become null. No
process identifiers, new timers, success logs, or continuous telemetry are added.
Elapsed time includes queueing, handshake work and scheduling delays; it does not
separate them or prove process suspension. Ages cannot identify a unique process.

## Verification and closure

Regressions exercise actual pg-pool with local fake clients (no sockets) for
connection rejection, queue expiry and idle cleanup. Other tests preserve promise
and callback outcomes, callback exceptions, logging exceptions, error identity,
redaction, development reuse, and existing transaction cleanup.

This does not reproduce the production incident. Before issue closure, review
and publish the exact patch with approval, verify CI, follow the separate release
gates, and observe a subsequent incident or an explicitly authorized staging
reproduction. Record diagnostic categories/counts without raw logs. UI, routes,
persistence and external providers are unchanged and are not live-tested here.
