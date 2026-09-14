# Backlog archive — September 14, 2026

This preserves the 21 issues open at the audit that were created before June 1, 2026. The cutoff uses GitHub creation timestamps. The original title, timestamp, URL and body are retained below. The snapshot contained 33 open issues in total.

The user authorized archiving and closing this older backlog while consolidating important unresolved work. **Archived or consolidated does not mean fixed.** Deferred items remain discoverable here without keeping separate open tickets.

## Audit and publication status

Assessment used the September 14 staging checkout. No production database audit, deployed-flow reproduction or real-account authentication test was performed for this consolidation. Historical counts and performance reports are preserved as original claims, not reaffirmed facts. GitHub readback confirmed all 21 archived issues closed with reason `not_planned` on September 14, 2026. Their closure comments identify the replacement or deferred disposition and state that this archive awaits publication. The YouTube follow-up was appended to #1160 while preserving its original body. After this consolidation and the concurrent current-work updates, 22 issues remained open (down from the initial 33). Pete approved the local review and requested PR preparation. This archive is submitted through the normal PR process and is not yet merged.

## Consolidated work

- [#1260](https://github.com/xdjs/MusicNerdWeb/issues/1260): claim transitions, concurrent claims and action abuse/cost controls.
- [#1262](https://github.com/xdjs/MusicNerdWeb/issues/1262): admin role changes by stable user ID.
- [#1263](https://github.com/xdjs/MusicNerdWeb/issues/1263): authentication and session reliability.
- [#1264](https://github.com/xdjs/MusicNerdWeb/issues/1264): link submission resilience and focused coverage.
- [#1265](https://github.com/xdjs/MusicNerdWeb/issues/1265): Pete/Sweetman research-flow review and worker operations.
- Existing [#1160](https://github.com/xdjs/MusicNerdWeb/issues/1160): legacy identity-data audit, including YouTube handles.

## Issue index

| Issue | Created | Disposition |
| --- | --- | --- |
| [#1112](https://github.com/xdjs/MusicNerdWeb/issues/1112) No state-machine guard on approveClaim / rejectClaim / updateVaultSourceStatus | 2026-04-12 | Consolidated into [#1260](https://github.com/xdjs/MusicNerdWeb/issues/1260) |
| [#1110](https://github.com/xdjs/MusicNerdWeb/issues/1110) Server actions for claim/vault bypass rate limiting | 2026-04-12 | Consolidated into [#1260](https://github.com/xdjs/MusicNerdWeb/issues/1260) |
| [#1109](https://github.com/xdjs/MusicNerdWeb/issues/1109) TOCTOU race in claimArtistProfile rejected-claim path | 2026-04-12 | Consolidated into [#1260](https://github.com/xdjs/MusicNerdWeb/issues/1260) |
| [#1074](https://github.com/xdjs/MusicNerdWeb/issues/1074) feat: detect and notify when agent workers die (Tier 5-lite) | 2026-03-27 | Consolidated into [#1265](https://github.com/xdjs/MusicNerdWeb/issues/1265) |
| [#1073](https://github.com/xdjs/MusicNerdWeb/issues/1073) perf: investigate slow batch writes in resolve_artist_id | 2026-03-27 | Consolidated into [#1265](https://github.com/xdjs/MusicNerdWeb/issues/1265) |
| [#1035](https://github.com/xdjs/MusicNerdWeb/issues/1035) Data cleanup: migrate @username values from youtubechannel to youtube column | 2026-03-10 | Consolidated into [#1160](https://github.com/xdjs/MusicNerdWeb/issues/1160) |
| [#1002](https://github.com/xdjs/MusicNerdWeb/issues/1002) Cleanup: remove plans/ directory from repository | 2026-02-24 | Archived; deferred or superseded, not fixed |
| [#1001](https://github.com/xdjs/MusicNerdWeb/issues/1001) Cleanup: consolidate AutoRefresh and PrivyLogin reload logic | 2026-02-24 | Consolidated into [#1263](https://github.com/xdjs/MusicNerdWeb/issues/1263) |
| [#999](https://github.com/xdjs/MusicNerdWeb/issues/999) Cleanup: replace `as any` casts in PrivyLogin token acquisition | 2026-02-24 | Consolidated into [#1263](https://github.com/xdjs/MusicNerdWeb/issues/1263) |
| [#995](https://github.com/xdjs/MusicNerdWeb/issues/995) Cleanup: remove dead ZodError catch in mcp/server.ts | 2026-02-24 | Archived; deferred or superseded, not fixed |
| [#985](https://github.com/xdjs/MusicNerdWeb/issues/985) Cache platform regex fetch in AddArtistData with React Query | 2026-02-14 | Consolidated into [#1264](https://github.com/xdjs/MusicNerdWeb/issues/1264) |
| [#983](https://github.com/xdjs/MusicNerdWeb/issues/983) Remove ineffective client-side Twitter CORS validation in AddArtistData | 2026-02-14 | Consolidated into [#1264](https://github.com/xdjs/MusicNerdWeb/issues/1264) |
| [#982](https://github.com/xdjs/MusicNerdWeb/issues/982) Clean up AddArtistData code quality issues | 2026-02-14 | Consolidated into [#1264](https://github.com/xdjs/MusicNerdWeb/issues/1264) |
| [#979](https://github.com/xdjs/MusicNerdWeb/issues/979) Extract shared useUserFetch hook from ClientWrapper components | 2026-02-13 | Consolidated into [#1263](https://github.com/xdjs/MusicNerdWeb/issues/1263) |
| [#978](https://github.com/xdjs/MusicNerdWeb/issues/978) Add test coverage for restored page components | 2026-02-13 | Link-submission coverage in [#1264](https://github.com/xdjs/MusicNerdWeb/issues/1264); remaining page coverage in [#1270](https://github.com/xdjs/MusicNerdWeb/issues/1270) |
| [#977](https://github.com/xdjs/MusicNerdWeb/issues/977) Replace DOM manipulation login pattern with React context/hook | 2026-02-13 | Consolidated into [#1263](https://github.com/xdjs/MusicNerdWeb/issues/1263) |
| [#971](https://github.com/xdjs/MusicNerdWeb/issues/971) Add enhanced error logging context to user API routes | 2026-02-10 | Archived; deferred or superseded, not fixed |
| [#970](https://github.com/xdjs/MusicNerdWeb/issues/970) Eliminate double session fetching in removeArtistData route | 2026-02-10 | Archived; deferred or superseded, not fixed |
| [#966](https://github.com/xdjs/MusicNerdWeb/issues/966) bug: Adding a user to the whitelist from admin panel does not work | 2026-02-10 | Consolidated into [#1262](https://github.com/xdjs/MusicNerdWeb/issues/1262) |
| [#951](https://github.com/xdjs/MusicNerdWeb/issues/951) Add integration tests for Privy auth flows | 2026-01-28 | Consolidated into [#1263](https://github.com/xdjs/MusicNerdWeb/issues/1263) |
| [#948](https://github.com/xdjs/MusicNerdWeb/issues/948) Verify identity token fallback works with real Privy accounts | 2026-01-28 | Consolidated into [#1263](https://github.com/xdjs/MusicNerdWeb/issues/1263) |

## Preserved issue records


### #1112 — No state-machine guard on approveClaim / rejectClaim / updateVaultSourceStatus

- Original URL: [https://github.com/xdjs/MusicNerdWeb/issues/1112](https://github.com/xdjs/MusicNerdWeb/issues/1112)
- Created: `2026-04-12T21:31:17Z`
- Disposition: Consolidated into [#1260](https://github.com/xdjs/MusicNerdWeb/issues/1260).
- September 14 evidence: Claim approve/reject still update by ID without expected status (dashboardQueries.ts:110,127). Preserve current approved-to-rejected Lore curation; the old pending-only source prescription is obsolete.

<details>
<summary>Original issue body (preserved)</summary>

## Severity
P2 (surfaced in /review audit of claim/vault flow — PR #1108 fixes the three P1s)

## Problem
\`src/server/utils/queries/dashboardQueries.ts\` has three status-transition queries with no state machine:

- \`approveClaim(claimId)\` — \`UPDATE artist_claims SET status = 'approved' WHERE id = $1\` (no \`status\` filter)
- \`rejectClaim(claimId)\` — \`UPDATE artist_claims SET status = 'rejected' WHERE id = $1\` (no \`status\` filter)
- \`updateVaultSourceStatus(sourceId, status)\` — same pattern

Any status can flip to any other status unconditionally:
- Admin can accidentally re-approve a rejected claim (bypassing the \`claimArtistProfile\` rejected-cleanup path that lets a new user claim)
- Admin can re-reject an approved claim without going through \`revokeClaimAction\` (which is the audit-logged path)
- Vault sources can flip freely between pending/approved/rejected without review

**Note:** PR #1108 introduces \`revokeApprovedClaim\` which DOES have a \`WHERE status = 'approved'\` guard. This issue is about bringing the same discipline to approve/reject/source-status.

## Impact
- Race conditions where a revoke and a re-approve interleave can leave the table in unexpected states
- Admin typos have irreversible effects (no "you can't re-approve a rejected claim" error)
- Vault source review workflow has no audit trail of state transitions

## Fix
Add explicit \`WHERE status = <expected>\` guards:

\`\`\`ts
export async function approveClaim(claimId: string) {
    const [updated] = await db
        .update(artistClaims)
        .set({ status: "approved", updatedAt: sql\`(now() AT TIME ZONE 'utc'::text)\` })
        .where(and(eq(artistClaims.id, claimId), eq(artistClaims.status, "pending")))
        .returning();
    return updated; // undefined if claim wasn't pending
}
\`\`\`

Same pattern for \`rejectClaim\` (pending → rejected only) and \`updateVaultSourceStatus\` (pending → approved|rejected only; no approved → rejected flip without going through \`deleteVaultSource\`).

Update callers in \`adminClaimActions.ts\` to surface "Claim is no longer pending" errors when \`updated\` is undefined.

## Files
- \`src/server/utils/queries/dashboardQueries.ts\` (approveClaim, rejectClaim, updateVaultSourceStatus)
- \`src/app/actions/adminClaimActions.ts\` (approveClaimAction, rejectClaimAction error surfaces)
- \`src/app/actions/dashboardActions.ts\` (updateSourceStatus error surfaces)

## Related
PR #1108 (revokeApprovedClaim helper — already uses this guard pattern, use as template)

</details>


### #1110 — Server actions for claim/vault bypass rate limiting

- Original URL: [https://github.com/xdjs/MusicNerdWeb/issues/1110](https://github.com/xdjs/MusicNerdWeb/issues/1110)
- Created: `2026-04-12T21:30:45Z`
- Disposition: Consolidated into [#1260](https://github.com/xdjs/MusicNerdWeb/issues/1260).
- September 14 evidence: Claim/search/add-source actions lack action throttles; middleware covers API routes. Preserve authentication and add effective cost/abuse limits.

<details>
<summary>Original issue body (preserved)</summary>

## Severity
P2 (surfaced in /review audit of claim/vault flow — PR #1108 fixes the three P1s)

## Problem
\`src/middleware.ts\` rate-limits \`/api/*\` requests but Next.js server actions POST to the page route with a \`Next-Action\` header and never touch \`/api/*\`. These claim/vault server actions are unrate-limited:

- \`claimArtistProfile\` — can be spammed to flood Discord webhooks and fill pending claims. Since \`isPending && !isPendingByUser\` hides the Claim button from other users on the profile page, a spammer can soft-lock every artist on the site.
- \`searchWebForSources\` — burns Gemini Flash + Google Search grounding tokens per call. **No cap.** Directly affects hosting cost.
- \`addVaultSource\` — spams \`fetchPageContent\` outbound HTTP, fills dashboard with pending entries.
- \`seedMockSources\` — related issue: this should be dev-only anyway (see separate issue).
- \`updateSourceStatus\`, \`searchWebForSources\`, bio version actions — less critical but same class of exposure.

## Impact
- **Cost**: \`searchWebForSources\` is the scariest — a malicious approved claimer can rack up Gemini quota.
- **Abuse**: claim spam creates pending claims that visually block the Claim button for other legitimate users
- **Noise**: Discord webhook floods on claim + approve/reject/revoke

## Fix options
**A. Per-action in-process rate limiting** (quickest)
Add a shared helper \`withRateLimit(key, windowMs, max)\` that tracks per-userId counts in a Map (same serverless caveat as \`middleware.ts\`). Apply to \`claimArtistProfile\`, \`searchWebForSources\`, \`addVaultSource\`.

**B. Extend middleware to match Next.js server action POSTs**
Server actions POST to the current page route with header \`Next-Action: <id>\`. Middleware can match this header and apply rate limits before the handler runs. Cleaner, but requires knowing which action is being called to pick a bucket.

**C. External store (Upstash / Vercel Runtime Cache)**
Shared across serverless instances. Right answer for production but heavier.

## Recommended shape
- Strict bucket for \`searchWebForSources\`: 5 req / 10 minutes per user (cost protection)
- Strict bucket for \`claimArtistProfile\`: 10 req / hour per user (abuse protection)
- Default bucket for \`addVaultSource\` / \`updateSourceStatus\`: 60 req / minute per user

## Files
- \`src/middleware.ts\` (current rate limiter, for reference)
- \`src/app/actions/dashboardActions.ts\`
- \`src/app/actions/adminClaimActions.ts\` (admin actions — probably lighter limits)

</details>


### #1109 — TOCTOU race in claimArtistProfile rejected-claim path

- Original URL: [https://github.com/xdjs/MusicNerdWeb/issues/1109](https://github.com/xdjs/MusicNerdWeb/issues/1109)
- Created: `2026-04-12T21:30:28Z`
- Disposition: Consolidated into [#1260](https://github.com/xdjs/MusicNerdWeb/issues/1260).
- September 14 evidence: The rejected-claim delete path was removed; active-only read then insert still returns a generic failure on concurrent insert conflict (dashboardActions.ts:48).

<details>
<summary>Original issue body (preserved)</summary>

## Severity
P2 (surfaced in /review audit of claim/vault flow — PR #1108 fixes the three P1s)

## Problem
\`src/app/actions/dashboardActions.ts:40-48\` does \`getClaimByArtistId\` → \`deleteClaim\` (if rejected) → \`createClaim\` as three separate round-trips with no transaction.

\`\`\`ts
const existing = await getClaimByArtistId(artistId);
if (existing) {
    if (existing.status === "rejected") {
        await deleteClaim(existing.id);
    } else {
        return { success: false, alreadyClaimed: true, ... };
    }
}
const referenceCode = generateReferenceCode();
await createClaim(session.user.id, artistId, referenceCode);
\`\`\`

Two users concurrently reclaiming an artist that had a rejected claim can both pass the read, both delete (one is a no-op), both attempt to insert, and one hits the \`UNIQUE(artist_id)\` constraint — surfaced as a generic "Failed to claim artist profile" log.

## Impact
- UNIQUE constraint prevents data corruption (one claim wins)
- Misleading error messages, noisy error logs
- Also affects analytics/Discord signals if both paths trigger webhooks before failing

## Fix options
**A. Wrap in a transaction:**
\`\`\`ts
await db.transaction(async (tx) => {
    const existing = await tx.query.artistClaims.findFirst({ where: eq(artistClaims.artistId, artistId) });
    if (existing?.status === "rejected") {
        await tx.delete(artistClaims).where(eq(artistClaims.id, existing.id));
    } else if (existing) {
        throw new AlreadyClaimedError();
    }
    await tx.insert(artistClaims).values({ userId, artistId, status: "pending", referenceCode });
});
\`\`\`

**B. Single upsert with ON CONFLICT:**
\`\`\`sql
INSERT INTO artist_claims (user_id, artist_id, status, reference_code) VALUES ($1, $2, 'pending', $3)
ON CONFLICT (artist_id) DO UPDATE
  SET user_id = EXCLUDED.user_id, status = 'pending', reference_code = EXCLUDED.reference_code
  WHERE artist_claims.status = 'rejected'
RETURNING *;
\`\`\`
Then check \`RETURNING\` — if no row, the existing claim was pending/approved and the insert was refused.

Option B is cheaper (single round-trip) and atomic without advisory locks.

## Files
- \`src/app/actions/dashboardActions.ts\` (claimArtistProfile)
- \`src/server/utils/queries/dashboardQueries.ts\` (new helper: createOrReplaceRejectedClaim)

</details>


### #1074 — feat: detect and notify when agent workers die (Tier 5-lite)

- Original URL: [https://github.com/xdjs/MusicNerdWeb/issues/1074](https://github.com/xdjs/MusicNerdWeb/issues/1074)
- Created: `2026-03-27T00:40:23Z`
- Disposition: Consolidated into [#1265](https://github.com/xdjs/MusicNerdWeb/issues/1265).
- September 14 evidence: Heartbeat queries compute dead status, but no automatic stale-worker alert was found; confirm these workers remain operational.

<details>
<summary>Original issue body (preserved)</summary>

## Context

When both production workers timed out and exited, there was no notification. The only way to discover dead workers is to SSH into the droplet and check tmux sessions, or manually open the admin dashboard. During a multi-day production run, this means hours of lost processing time before anyone notices.

## Current state

- Worker heartbeats are stored in `agent_heartbeats` with `updated_at` timestamps
- The admin dashboard shows worker status (running/stopped/dead) but only when someone is looking at it
- `check-status.sh` exists on the droplet but requires SSH access
- The project already has a Discord webhook (`DISCORD_WEBHOOK_URL`) used for UGC notifications

## Proposed solution (Tier 5-lite from monitoring plan)

Send a Discord notification when a worker goes stale. Trigger options:

**Option A: Cron-based check**
- Vercel cron job (e.g. every 5 minutes) hits a new endpoint `/api/cron/agent-health`
- Queries `agent_heartbeats` for workers where `status = 'running'` but `updated_at` is older than `batchTimeout + 120s`
- Sends Discord webhook for each newly-dead worker
- Needs dedup to avoid repeated alerts (track last alert time in the heartbeat row or a simple flag)

**Option B: Check on heartbeat upsert**
- When `upsertHeartbeat()` receives a `status: "stopping"` or `status: "error"`, fire a Discord notification
- Simpler but only works if the worker manages to send a final heartbeat before dying (doesn't cover hard kills like OOM/SIGKILL)

**Option C: Both**
- Heartbeat-triggered for clean shutdowns (immediate notification)
- Cron-triggered for hard kills (5-minute detection window)

## Alert types

- Worker died (heartbeat stale)
- Worker stopped with error (auth failure, consecutive failures)
- Worker finished (reached max iterations or all artists mapped)
- Rate limit spike (optional)

## References

- Heartbeat table: `agent_heartbeats`
- Discord webhook: `DISCORD_WEBHOOK_URL` env var
- Existing Discord notification code: `src/server/utils/queries/artistQueries.ts` (UGC notification pattern)
- Monitoring plan: `docs/agent-monitoring-plan.md` → Tier 5-lite section

</details>


### #1073 — perf: investigate slow batch writes in resolve_artist_id

- Original URL: [https://github.com/xdjs/MusicNerdWeb/issues/1073](https://github.com/xdjs/MusicNerdWeb/issues/1073)
- Created: `2026-03-27T00:38:04Z`
- Disposition: Consolidated into [#1265](https://github.com/xdjs/MusicNerdWeb/issues/1265).
- September 14 evidence: resolveArtistMappingBatch still awaits items sequentially. Historical production timings are not current measurements; profile before optimizing.

<details>
<summary>Original issue body (preserved)</summary>

## Context

During the first production run with `BATCH_SIZE=50`, the batch write step in `resolve_artist_id` took ~2 minutes for 50 artists, pushing total batch time to ~20 minutes and hitting the 1200s timeout. Both workers timed out (exit code 124) after completing all resolutions but before generating the session report.

Reduced to `BATCH_SIZE=30` as a workaround.

## Current behavior

Each item in a batch call goes through:
1. `resolve_artist_id` upsert (INSERT ... ON CONFLICT)
2. `logMcpAudit` (INSERT into mcp_audit_log)

With 50 artists × ~4 platforms each = ~200 items, that's ~400 sequential DB queries in a single MCP request. At ~3ms/query that should be ~1.2s, but observed ~2 minutes — likely due to connection pool overhead, Vercel cold starts, or serialization costs.

## Potential optimizations

- **Multi-row INSERT** — batch items into fewer SQL statements instead of one upsert per item
- **Reduce audit logging** — skip audit entries for opportunistic cross-platform saves (only audit the primary Deezer mapping)
- **Parallel write chunks** — split the batch into smaller parallel groups
- **Profile** — add timing logs to `resolve_artist_id` to identify where the time is spent

## Impact

Would allow `BATCH_SIZE=50` (or higher) without timeouts, improving throughput ~40%.

## References

- Batch timeout: `agents/id-mapping/run-full-catalog.sh` (BATCH_TIMEOUT=1200)
- Resolve logic: `src/server/utils/idMappingService.ts` → `resolveArtistMapping()`
- MCP tool: `src/app/api/mcp/server.ts` → `resolve_artist_id` (batch mode)
- Audit: `src/app/api/mcp/audit.ts`

</details>


### #1035 — Data cleanup: migrate @username values from youtubechannel to youtube column

- Original URL: [https://github.com/xdjs/MusicNerdWeb/issues/1035](https://github.com/xdjs/MusicNerdWeb/issues/1035)
- Created: `2026-03-10T17:05:54Z`
- Disposition: Consolidated into [#1160](https://github.com/xdjs/MusicNerdWeb/issues/1160).
- September 14 evidence: A historical YouTube migration script exists, but execution/current affected rows were not verified. Audit current handles and conflicts; do not assume the old 140-row count.

<details>
<summary>Original issue body (preserved)</summary>

## Problem

The `youtubechannel` column on the `artists` table contains 140 rows with `@username` values (e.g., `@RoyksoppMusic`, `@kevali_`). These are YouTube usernames, not channel IDs — they belong in the `youtube` column instead.

This is legacy data from before the youtube/youtubechannel column separation was properly enforced. The display code in `getArtistLinks()` already handles this gracefully (detects `@` prefix and builds a username URL), so there is no user-facing bug.

## Proposed Fix

Write a data migration that:

1. For each artist where `youtubechannel LIKE '@%'`:
   - If `youtube` is NULL: move the value to `youtube` (stripping the `@` prefix) and set `youtubechannel` to NULL
   - If `youtube` already has a value: leave both columns as-is (needs manual review)
2. Log any conflicts for manual resolution

## Scope

- 140 rows affected (confirmed via prod query, 0 are actual channel IDs)
- No code changes needed — only a data migration
- The display layer already handles both formats, so this is a consistency cleanup

## Context

Discovered during planning for the MCP artist link tools feature (`docs/mcp-artist-link-tools.md`). The `extractArtistId()` refactor (Phase 1A) ensures no new `@username` values will be written to `youtubechannel` going forward, but the existing data remains.

</details>


### #1002 — Cleanup: remove plans/ directory from repository

- Original URL: [https://github.com/xdjs/MusicNerdWeb/issues/1002](https://github.com/xdjs/MusicNerdWeb/issues/1002)
- Created: `2026-02-24T17:55:20Z`
- Disposition: Archived as deferred/superseded; no replacement issue.
- September 14 evidence: Superseded documentation direction: docs/README.md now explicitly retains plans as historical context, not a live task queue. Files remain intentionally historical; no deletion performed.

<details>
<summary>Original issue body (preserved)</summary>

The `plans/` directory contains 15 AI agent planning artifacts (e.g. `claude-privy-migration-implementation-plan.md`, `codex-privy-migration-implementation-plan.md`, etc.) and `docs/subagent-worktree-config.md`. These are development process documents, not production code.

Remove them from the repository or move to a wiki/notion.

_Flagged in PR #994 review._

</details>


### #1001 — Cleanup: consolidate AutoRefresh and PrivyLogin reload logic

- Original URL: [https://github.com/xdjs/MusicNerdWeb/issues/1001](https://github.com/xdjs/MusicNerdWeb/issues/1001)
- Created: `2026-02-24T17:55:17Z`
- Disposition: Consolidated into [#1263](https://github.com/xdjs/MusicNerdWeb/issues/1263).
- September 14 evidence: PrivyLogin hard reload and AutoRefresh session-transition refresh both remain. Establish intended real-account behavior before consolidating.

<details>
<summary>Original issue body (preserved)</summary>

`PrivyLogin.tsx` uses `window.location.reload()` after login. `AutoRefresh.tsx` uses `router.refresh()` on the `unauthenticated → authenticated` transition. Because the hard reload resets all React state, `AutoRefresh`'s transition logic is never reached for the primary login path — making it effectively dead code for login.

Options:
1. Remove `AutoRefresh`'s unauthenticated→authenticated guard as unreachable
2. Document that `AutoRefresh` only handles session expiry/restoration, not initial login
3. Consolidate both into a single refresh strategy

_Flagged in PR #994 review._

</details>


### #999 — Cleanup: replace `as any` casts in PrivyLogin token acquisition

- Original URL: [https://github.com/xdjs/MusicNerdWeb/issues/999](https://github.com/xdjs/MusicNerdWeb/issues/999)
- Created: `2026-02-24T17:55:08Z`
- Disposition: Consolidated into [#1263](https://github.com/xdjs/MusicNerdWeb/issues/1263).
- September 14 evidence: PrivyLogin token acquisition still contains any-cast object fallbacks. Validate installed SDK contract and real account behavior.

<details>
<summary>Original issue body (preserved)</summary>

In `PrivyLogin.tsx`, token acquisition uses `as any` casts:

```ts
token = typeof authToken === 'string' ? authToken
      : (authToken as any)?.token || (authToken as any)?.accessToken || null;
```

This implies uncertainty about the Privy SDK's `getAccessToken()` return type. If the SDK types say it returns `string | null`, the non-string branch is dead code and should be removed. If the SDK can return an object (undocumented), that deserves a comment with a version reference.

_Flagged in PR #994 review._

</details>


### #995 — Cleanup: remove dead ZodError catch in mcp/server.ts

- Original URL: [https://github.com/xdjs/MusicNerdWeb/issues/995](https://github.com/xdjs/MusicNerdWeb/issues/995)
- Created: `2026-02-24T17:54:52Z`
- Disposition: Archived as deferred/superseded; no replacement issue.
- September 14 evidence: Deferred low-priority cleanup: MCP ZodError catch remains. Not fixed; revisit while modifying that handler.

<details>
<summary>Original issue body (preserved)</summary>

The `get_artist` handler in `src/app/api/mcp/server.ts` catches `ZodError`, but the MCP SDK validates tool inputs against the Zod schema before invoking the handler. The `ZodError` path is unreachable.

Remove the dead catch branch to avoid misleading future readers.

_Flagged in PR #994 review._

</details>


### #985 — Cache platform regex fetch in AddArtistData with React Query

- Original URL: [https://github.com/xdjs/MusicNerdWeb/issues/985](https://github.com/xdjs/MusicNerdWeb/issues/985)
- Created: `2026-02-14T22:49:28Z`
- Disposition: Consolidated into [#1264](https://github.com/xdjs/MusicNerdWeb/issues/1264).
- September 14 evidence: Platform regexes still fetched on component mount. Current layout changed; measure deduplication need rather than assuming the historical twice-per-page claim.

<details>
<summary>Original issue body (preserved)</summary>

## Problem

`AddArtistData.tsx:48-53` fetches platform regexes from `/api/platformRegexes` on every component mount:

```tsx
useEffect(() => {
    fetch('/api/platformRegexes')
        .then(res => res.json())
        .then(data => setPlatformRegexes(data))
        .catch(e => console.error('Failed to fetch platform regexes:', e));
}, []);
```

This data rarely changes (it comes from the `urlmap` DB table) but is fetched every time a user visits an artist page, since `AddArtistData` is rendered twice (once for "Social Media Links", once for "Support the Artist").

## Proposed Fix

Use React Query (`@tanstack/react-query`, already in the project) to cache the response:

```tsx
const { data: platformRegexes = [] } = useQuery({
  queryKey: ['platformRegexes'],
  queryFn: () => fetch('/api/platformRegexes').then(r => r.json()),
  staleTime: 1000 * 60 * 60, // 1 hour
});
```

This would:
- Deduplicate the two fetches per artist page into one
- Cache across page navigations
- Automatically handle loading/error states

## File
- `src/app/artist/[id]/_components/AddArtistData.tsx`

</details>


### #983 — Remove ineffective client-side Twitter CORS validation in AddArtistData

- Original URL: [https://github.com/xdjs/MusicNerdWeb/issues/983](https://github.com/xdjs/MusicNerdWeb/issues/983)
- Created: `2026-02-14T22:49:14Z`
- Disposition: Consolidated into [#1264](https://github.com/xdjs/MusicNerdWeb/issues/1264).
- September 14 evidence: Browser Twitter/X validation still catches fetch errors as valid. Replace misleading reachability validation with the supported validation path.

<details>
<summary>Original issue body (preserved)</summary>

## Problem

`AddArtistData.tsx:70-82` attempts to validate Twitter/X profile URLs by fetching them directly from the browser:

```tsx
async function validateTwitterLink(url: string): Promise<boolean> {
    try {
        const twitterRegex = /^https?:\/\/(www\.)?(twitter|x)\.com\/[A-Za-z0-9_]{1,15}$/;
        if (!twitterRegex.test(url)) return true;
        const response = await fetch(url, { method: "GET" });
        if (response.status === 404) return false;
        return true;
    } catch (e) {
        return true; // Network/CORS errors are considered valid
    }
}
```

This will **always** return `true` because:
1. Browser CORS policies block direct requests to `twitter.com` / `x.com`
2. The `catch` block returns `true` on CORS errors
3. The function provides false confidence in URL validity

## Why it's safe to remove

Server-side validation already exists in `extractArtistId()` (`src/server/utils/services.ts:49`), which validates URLs against the `urlmap` table's regex patterns. The client-side check is purely dead code.

## Fix

Either:
- **Remove** the `validateTwitterLink` function entirely and its call in `onSubmit`
- **Or** move it to the existing `/api/validateLink` backend endpoint (which already validates YouTube, SoundCloud, Bandcamp, etc.)

## File
- `src/app/artist/[id]/_components/AddArtistData.tsx`

</details>


### #982 — Clean up AddArtistData code quality issues

- Original URL: [https://github.com/xdjs/MusicNerdWeb/issues/982](https://github.com/xdjs/MusicNerdWeb/issues/982)
- Created: `2026-02-14T22:49:05Z`
- Disposition: Consolidated into [#1264](https://github.com/xdjs/MusicNerdWeb/issues/1264).
- September 14 evidence: Contribution onSubmit lacks outer try/finally; direct-edit branch has a catch. Unused memo dependency remains; original spinner wording in this component appears replaced.

<details>
<summary>Original issue body (preserved)</summary>

## Context

Identified during PR #981 review. These are pre-existing issues restored from the original component.

## Items

### 1. `useMemo` unused dependency (line 55-57)
```tsx
const formSchema = useMemo(() => z.object({
    artistDataUrl: z.string()
}), [availableLinks]) // availableLinks is not used in the memo
```
Fix: Change to `[]`.

### 2. Unprofessional alt text (line 256)
```tsx
<img className="max-h-6" src="/spinner.svg" alt="whyyyyy" />
```
Fix: Change to `alt=""` with `role="status"` and `aria-label="Loading"`.

### 3. Missing try-catch in `onSubmit` (line 138-166)
If an unexpected error occurs during validation or submission, `setIsLoading(false)` may not be called, leaving the button in a loading state.

Fix: Wrap the body in try/finally:
```tsx
async function onSubmit(values) {
  setIsLoading(true);
  try {
    // ... existing logic
  } finally {
    setIsLoading(false);
  }
}
```

## File
- `src/app/artist/[id]/_components/AddArtistData.tsx`

</details>


### #979 — Extract shared useUserFetch hook from ClientWrapper components

- Original URL: [https://github.com/xdjs/MusicNerdWeb/issues/979](https://github.com/xdjs/MusicNerdWeb/issues/979)
- Created: `2026-02-13T19:05:12Z`
- Disposition: Consolidated into [#1263](https://github.com/xdjs/MusicNerdWeb/issues/1263).
- September 14 evidence: Optional refactor only: wrappers still duplicate code, but profile now has distinct stale-session/404 handling. Preserve this difference if sharing logic.

<details>
<summary>Original issue body (preserved)</summary>

## Problem

`src/app/profile/ClientWrapper.tsx` and `src/app/leaderboard/ClientWrapper.tsx` contain nearly identical user-fetching logic:

```tsx
const { status, data: session } = useSession();
const [user, setUser] = useState<User | null>(null);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const fetchUser = async () => {
    if (status === "authenticated" && session?.user?.id) {
      const response = await fetch(`/api/user/${session.user.id}`);
      // ...
    }
  };
  if (status !== "loading") fetchUser();
}, [status, session]);
```

Both also define the same `User` type and `guestUser` fallback object.

## Proposed Solution

Extract a shared hook:

```tsx
// src/hooks/useUserFetch.ts
export function useUserFetch() {
  // Shared session + user fetch logic
  // Returns { user, isLoading, isAuthenticated }
}
```

This would:
- Eliminate ~40 lines of duplicated code per ClientWrapper
- Centralize the `User` type (or import from a shared types file)
- Centralize the guest user fallback
- Make it easy to add improvements (caching, retry) in one place

## Files to modify
- New: `src/hooks/useUserFetch.ts`
- `src/app/profile/ClientWrapper.tsx` — use the hook
- `src/app/leaderboard/ClientWrapper.tsx` — use the hook
- Possibly move `User` type to `src/types/`

</details>


### #978 — Add test coverage for restored page components

- Original URL: [https://github.com/xdjs/MusicNerdWeb/issues/978](https://github.com/xdjs/MusicNerdWeb/issues/978)
- Created: `2026-02-13T19:05:05Z`
- Disposition: Link-submission coverage in [#1264](https://github.com/xdjs/MusicNerdWeb/issues/1264); remaining page coverage in [#1270](https://github.com/xdjs/MusicNerdWeb/issues/1270).
- Decision (2026-09-14): Pete approved retaining the remaining page coverage as one low-priority follow-up for another day; #1270 is not a blocker for this release. No missing tests are claimed as completed.
- September 14 evidence: Blanket no-coverage claim is stale: AddArtistContent, AddArtistData, PrivyLogin and profile wrapper tests exist. Carry targeted remaining tests into current work; full coverage not established.

<details>
<summary>Original issue body (preserved)</summary>

## Context

Several components were restored from pre-migration stubs in #973 and #981 but have no test coverage:

- `src/app/add-artist/_components/AddArtistContent.tsx` (138 lines)
- `src/app/add-artist/page.tsx` (46 lines)
- `src/app/profile/ClientWrapper.tsx` (94 lines)
- `src/app/leaderboard/ClientWrapper.tsx` (108 lines)
- `src/app/profile/Dashboard.tsx` (~880 lines)
- `src/app/profile/Leaderboard.tsx`
- `src/app/artist/[id]/_components/AddArtistData.tsx` (276 lines, restored in #981)
- `src/app/_components/AutoRefresh.tsx` (106 lines, restored in #981)

## Test cases to cover

### AddArtistContent
- Renders artist info (name, image, followers, genres)
- Shows login prompt when unauthenticated
- Calls `addArtist` server action on button click
- Handles success/exists/error responses
- Disables button while adding

### ClientWrappers (profile + leaderboard)
- Shows loading spinner while session loads
- Fetches user data on authenticated session
- Falls back to guest user when unauthenticated
- Passes correct props to Dashboard/Leaderboard

### Dashboard
- Renders user info and stats
- Bookmark management (add/remove)
- Username editing flow
- Leaderboard rank display

### Leaderboard
- Date range filtering (today/week/month/all)
- User highlight in rankings
- Pagination

### AddArtistData (from #981)
- Renders "+" button for authenticated users, inert without session
- Opens modal on click when authenticated
- URL validation (Twitter, platform regex, backend validation)
- Submits form and shows success toast + leaderboard link
- Shows error states for invalid/duplicate URLs
- Closes modal and triggers router.refresh on success

### AutoRefresh (from #981)
- Does not refresh if already authenticated (sessionStorage skip flag)
- Triggers window.location.reload on auth state transition
- Shows loading overlay when `showLoading=true` and status is "loading"
- Returns null when `showLoading=false`
- Clears sessionStorage flag on unmount

## Notes
- Follow the Jest 30 mock pattern: `jest.resetModules()` + dynamic `await import()` (see `src/app/api/leaderboard/__tests__/route.test.ts` for reference)
- Dashboard.tsx is ~880 lines and may benefit from being broken into smaller components first

</details>


### #977 — Replace DOM manipulation login pattern with React context/hook

- Original URL: [https://github.com/xdjs/MusicNerdWeb/issues/977](https://github.com/xdjs/MusicNerdWeb/issues/977)
- Created: `2026-02-13T19:04:56Z`
- Disposition: Consolidated into [#1263](https://github.com/xdjs/MusicNerdWeb/issues/1263).
- September 14 evidence: AddArtistContent, Dashboard and AddArtistData still trigger login via getElementById(login-btn). Consolidate behind an intentional React login mechanism.

<details>
<summary>Original issue body (preserved)</summary>

## Problem

Multiple components use `document.getElementById("login-btn").click()` to trigger the login flow:

- `src/app/add-artist/_components/AddArtistContent.tsx` (lines 40-43, 63-66)
- `src/app/profile/Dashboard.tsx` (lines ~858-861)

This pattern is:
- **Brittle**: Relies on a hardcoded DOM ID that could change
- **Not React-like**: Bypasses React's event system
- **Hard to test**: Requires full DOM setup in tests
- **Accessibility concern**: May not work with keyboard navigation or screen readers

## Proposed Solution

Create a shared `useLogin()` hook or auth context that exposes a `triggerLogin()` function. Components import the hook instead of reaching into the DOM.

```tsx
// Example
const { triggerLogin } = useLogin();
// ...
if (!session) {
  triggerLogin();
  return;
}
```

## Files to modify
- `src/app/add-artist/_components/AddArtistContent.tsx`
- `src/app/profile/Dashboard.tsx`
- New: `src/hooks/useLogin.ts` (or similar)
- Possibly `src/app/_components/nav/components/Login.tsx` (to expose login trigger via context)

</details>


### #971 — Add enhanced error logging context to user API routes

- Original URL: [https://github.com/xdjs/MusicNerdWeb/issues/971](https://github.com/xdjs/MusicNerdWeb/issues/971)
- Created: `2026-02-10T22:57:33Z`
- Disposition: Archived as deferred/superseded; no replacement issue.
- September 14 evidence: Deferred low-priority observability improvement: recentEdited/userEntries logs still have little context. Not fixed; avoid logging sensitive payloads when revisiting.

<details>
<summary>Original issue body (preserved)</summary>

## Problem

Error logs in user-facing API routes (`recentEdited`, `userEntries`, `user/[id]`) only include the error object with a prefix tag:

```typescript
console.error("[recentEdited] error", error);
```

This makes it harder to debug production issues since there's no request context (userId, query params, etc.).

## Suggested Improvement

Add userId and relevant parameters to error logs:

```typescript
console.error("[recentEdited] error", { userId, error });
```

## Context

Identified during PR #964 code review. Low priority observability improvement.

</details>


### #970 — Eliminate double session fetching in removeArtistData route

- Original URL: [https://github.com/xdjs/MusicNerdWeb/issues/970](https://github.com/xdjs/MusicNerdWeb/issues/970)
- Created: `2026-02-10T22:54:45Z`
- Disposition: Archived as deferred/superseded; no replacement issue.
- September 14 evidence: Deferred low-priority refactor: route requireAuth and underlying business query still fetch the session separately. Preserve business authorization if consolidating.

<details>
<summary>Original issue body (preserved)</summary>

## Problem

`POST /api/removeArtistData` uses `requireAuth()` in the route handler for early 401 returns, but the underlying `removeArtistData()` business logic function in `artistQueries.ts` also calls `getServerAuthSession()` and performs its own auth + authorization checks (whitelist/admin).

This causes:
1. Two `getServerAuthSession()` calls per request (redundant DB/token verification)
2. Unclear authorization boundary — the route says "authenticated" but the function actually requires whitelist/admin

## Proposed Fix

**Option A (preferred):** Use `requireWhitelistedOrAdmin()` from `auth-helpers.ts` in the route handler, and refactor `removeArtistData()` to accept a `userId` parameter instead of fetching the session internally.

**Option B:** Keep the current structure but pass the session from the route handler into `removeArtistData()` to avoid the second fetch.

## Context

Identified during PR #963 code review. The double-fetch pattern exists because the business logic function pre-dates the `auth-helpers.ts` abstraction layer.

</details>


### #966 — bug: Adding a user to the whitelist from admin panel does not work

- Original URL: [https://github.com/xdjs/MusicNerdWeb/issues/966](https://github.com/xdjs/MusicNerdWeb/issues/966)
- Created: `2026-02-10T20:48:04Z`
- Disposition: Consolidated into [#1262](https://github.com/xdjs/MusicNerdWeb/issues/1262).
- September 14 evidence: Bulk admin selection maps users to wallet and filters nulls; email-only accounts become an empty list. Query returns success without updates for empty input. Code-backed failure class, not a reproduced production incident.

<details>
<summary>Original issue body (preserved)</summary>

## Description

Adding a user to the whitelist from the admin panel does not persist the change.

## Steps to Reproduce

1. Login as admin
2. Navigate to admin panel
3. Select a non-whitelisted user
4. Click "Add Whitelist"

## Expected Behavior

The selected user is whitelisted.

## Actual Behavior

The selected user is not whitelisted. The change does not persist.

</details>


### #951 — Add integration tests for Privy auth flows

- Original URL: [https://github.com/xdjs/MusicNerdWeb/issues/951](https://github.com/xdjs/MusicNerdWeb/issues/951)
- Created: `2026-01-28T23:58:22Z`
- Disposition: Consolidated into [#1263](https://github.com/xdjs/MusicNerdWeb/issues/1263).
- September 14 evidence: Mock tests now cover parts of tokens/legacy/merge paths. Real SDK/account behavior and meaningful rollback/concurrency verification remain separate requirements.

<details>
<summary>Original issue body (preserved)</summary>

## Context
Follow-up from PR #950 code review (issue #13).

## Test scenarios needed
- [ ] Token retry logic in PrivyLogin component
- [ ] Account merge transaction rollback scenarios
- [ ] Race condition handling in session refresh
- [ ] Invalid token format handling
- [ ] Legacy wallet linking flow

## Related
- PR #950 - Add Privy email-first authentication

</details>


### #948 — Verify identity token fallback works with real Privy accounts

- Original URL: [https://github.com/xdjs/MusicNerdWeb/issues/948](https://github.com/xdjs/MusicNerdWeb/issues/948)
- Created: `2026-01-28T19:55:12Z`
- Disposition: Consolidated into [#1263](https://github.com/xdjs/MusicNerdWeb/issues/1263).
- September 14 evidence: Identity fallback getUser({ idToken }) remains; current test mocks assert the call but do not establish SDK support or real-account success.

<details>
<summary>Original issue body (preserved)</summary>

## Problem

The identity token fallback in `src/server/utils/privy.ts` uses an API pattern that may not be officially supported:

```typescript
else if (authToken.startsWith('idtoken:')) {
  const idToken = authToken.slice(8);
  user = await privyClient.getUser({ idToken });
}
```

It's unclear if `privyClient.getUser({ idToken })` is a documented/supported API pattern in the Privy SDK. This code path was added as a fallback but has only been tested with Privy test users (which don't receive tokens).

## Proposed Solution

1. Test with a real Privy account (not test users) to verify:
   - Does `getIdentityToken()` return a valid token for real users?
   - Does `privyClient.getUser({ idToken })` work with that token?

2. If the API is not supported:
   - Add error handling for unsupported token types
   - Consider removing the identity token fallback if it doesn't work
   - Document any limitations

3. If the API is supported:
   - Add a comment referencing the Privy documentation
   - Add integration tests for this code path

## Impact

Medium - If this fallback doesn't work with real users, it could cause authentication failures in edge cases.

## Related

- PR #946 - Privy Authentication Migration
- Privy SDK documentation: https://docs.privy.io/

</details>
