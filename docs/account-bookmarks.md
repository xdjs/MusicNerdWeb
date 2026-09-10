# Account bookmarks

> **Unreleased local feature contract (`pete/artist-latest`).** The implementation, migration
> and test files described below are not included in this documentation release. Read
> [MEMORY.md](../MEMORY.md) for verification and release gates before using these commands.

## User outcome

A signed-in person saves an artist, then sees that bookmark in their account on another device.
The artist button and profile panel share the same account data. Edits can be reordered or
removed as a draft; Save persists them, while Cancel leaves the saved list untouched.
Failed writes show an error, not a successful bookmark state.

The server is authoritative. Active views refresh every 30 seconds and on window focus; another
device can also reload immediately. This is polling, not a new realtime subscription service.

## Path and ownership

`BookmarkButton` / profile `BookmarksPanel` → shared `useBookmarks` query/mutation hook →
`/api/bookmarks` → `bookmarkQueries` → `user_artist_bookmarks`.

- GET reads only the signed-in account. POST unions artist IDs; DELETE removes one; PATCH
  explicitly removes listed IDs and reorders existing entries. A stale draft cannot replace the
  entire account list, erase another device's additions, or resurrect an already removed entry.
- Ownership comes from NextAuth, never a body/query parameter. `X-Bookmark-Account` is an expected
  account assertion: a cookie/account change rejects the request before importing or writing.
  Response ownership is checked again on the client; cache keys include the account ID.
- Responses are private/no-store. RLS is enabled, public API roles have no grants, and the app
  role has only CRUD. Because this app uses shared `mnweb`, per-account authorization remains
  in the endpoint and owner-scoped queries, not Supabase `auth.uid()`.
- Writes lock the account row before reading/modifying bookmarks. Account merges lock both
  accounts in a fixed order and transfer the union before deleting the placeholder.
- Wallet linking verifies the wallet against the authenticated Privy user on the server.
  Session refresh follows the surviving database account ID after a merge.
- Names and images come from current artist data, not user-provided bookmark metadata.

## Existing browser saves

The old `localStorage[bookmarks_<userId>]` key is an import source, not ongoing persistence.
After confirming the response owner, the client imports IDs in batches of up to 500, adding
only existing artists and preserving server bookmarks. It removes only the exact local snapshot
whose import succeeded. Malformed data or a failed request remains local, with a retry message.

After a server-confirmed account merge, pending browser imports move to the surviving account's
key before refresh. The source isn't removed until the combined target has been written.
Accounts on another device can import that device's legacy snapshot on first visit; an old
snapshot can re-add an artist removed elsewhere during the initial migration period.

## Migration / release gate

`drizzle/0024_user_artist_bookmarks.sql`, its journal entry and snapshot belong together.
This adds one table with user/artist foreign keys, ordering indexes, RLS and `mnweb` grants.
It does not rewrite existing data. It is **not** a blanket-idempotent migration: inspect whether
the table exists before applying, and use a transaction for the whole file.

Apply and verify dev first, then production before deploying dependent code, with the agreed
approvals. Follow [the database protocol](development.md#database-migrations). The existence of
this file does not mean it has been applied; environment state is in `MEMORY.md`.

## Verification

- Jest covers endpoint ownership/headers/validation, SQL scoping and ordering, merge transfer,
  client import and failure behavior, account switching, independent client caches and real
  button/panel Save/Cancel behavior.
- Verify migration constraints and actual CRUD as `mnweb`, plus denial for `anon` and
  `authenticated`. `scripts/verify-bookmarks-local.ts` exercises the actual migration and query
  implementations, concurrent saves/merges, stale edits and cascading deletion against Postgres.
  It requires a fresh disposable cluster whose data directory is
  `/tmp/musicnerd-bookmark-db.<unique-suffix>/data`, rejects non-loopback hosts, and removes only
  the verification database it created. Never point it at an existing development cluster.
- The opt-in `e2e/account-bookmarks.spec.ts` uses the existing Privy test login, two browser
  contexts sharing only session cookies, and an artist not already saved by the test account.
  It saves through the artist button, reads the profile on the second browser, cancels a draft,
  removes the test bookmark, verifies the first browser and checks anonymous denial.

With that disposable cluster running, supply its local administrator and port (no hosted URL):

```bash
BOOKMARK_TEST_ADMIN_URL=postgres://<local-admin>@127.0.0.1:<port>/postgres \
NODE_ENV=test npx tsx scripts/verify-bookmarks-local.ts
```

Stop the disposable cluster afterward. This check does not apply anything to Supabase or prove
the hosted app's login/browser flow.

After confirming the local app points to **dev**, and applying 0024 there:

```bash
E2E_BOOKMARK_WRITES=1 LATEST_ARTIST_ID=<existing-artist-uuid> \
E2E_BASE_URL=https://localhost:3002 \
npx playwright test e2e/account-bookmarks.spec.ts --workers=1
```

This test writes to the configured test account and cleans up only its newly added bookmark.
It refuses a non-local URL. Test account email/OTP can be supplied via `E2E_BOOKMARK_EMAIL` /
`E2E_BOOKMARK_OTP`; otherwise it uses the repository's existing Privy test account.
The test is skipped unless explicitly enabled. A skip is not a cross-device verification pass.
Actual results and remaining gaps are recorded in the handoff.
