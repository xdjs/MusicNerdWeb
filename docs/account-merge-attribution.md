# Account merge attribution

Tracked in [#1389](https://github.com/xdjs/MusicNerdWeb/issues/1389).

After Link Wallet verifies the signed-in user's wallet against Privy's server response,
MusicNerdAPI's `mergeAccounts` moves the placeholder account into the surviving legacy account. Existing
Lore credits and Admin activity must resolve to that survivor and its current public name.
Event/source IDs, timestamps, actions, origins and parent relationships stay unchanged.
Previously unknown actors stay unknown; this change cannot reconstruct lost identity.

## Transaction and permissions

Migration 0035 adds `account_merge_events` and `transfer_account_activity`. The function
is a narrowly scoped SECURITY DEFINER exception for account consolidation: it changes only
`artist_activity_events.actor_user_id` for one source account and records the source,
survivor, event count and merge time. The ledger retains raw UUIDs without foreign keys so
later account deletion cannot erase the audit. A subsequent merge records another hop.

The existing merge transaction locks both users before moving the Privy identity, then
calls the function before deleting the placeholder. The function checks distinct existing
accounts, a released source identity and the expected Privy identity on the survivor,
and locks both users in stable order. Any transfer, audit or later merge failure rolls
back the entire transaction. Foreign-key checks on concurrent activity inserts serialize
with those row locks: an insert either precedes the transfer or fails against the deleted
account; it must never commit a newly anonymous event.

The `mnweb` backend role can execute the function. It has no direct UPDATE or
DELETE permission on activity, and SELECT only on the merge ledger. Database owners
and Supabase’s privileged service role retain their administrative access. Browser roles and
PUBLIC cannot execute the function or access the ledger. A fixed search path and qualified
relations prevent object shadowing. The function does not independently verify wallet
ownership: the authenticated Link Wallet route remains that authorization boundary.
Do not expose this operation as a browser-callable RPC or use it for ordinary account edits.

## Verification and rollout

Database regressions must call the real merge, contributor projection and Admin activity
reader. Cover existing events on both accounts, user-triggered research, unknown actors,
rejected merges, rollback after transfer, and exact app-role grants/RLS. Run the Link Wallet
authorization tests as well; local SQL cannot prove the live Privy login integration.

Apply all of 0035 in one transaction with an authorized DDL connection before deploying dependent code, first on
staging and separately on production per the release runbook. A missing function fails the
merge transaction safely, retaining the placeholder and its attribution. There is no
historical backfill or change to the artist/profile UI in this patch.

The merge and its regressions live in MusicNerdAPI (`lib/account/`). Web still owns migration
0035, so Jest runs its grant and transfer-function checks in
`src/server/db/__tests__/accountMergeMigration.test.ts` without a server.
