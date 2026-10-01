# User names

Issue #1387. A user name is the public account label. The stable user ID owns
contributions; names are resolved from the current user record, never copied into
new contribution rows. Updating a name updates past in-app credits on their next read.
External historical messages and sources with no recorded contributor cannot be rewritten.

Accounts without a chosen name (blank, email-like, or matching their wallet) receive a
saved, Music Nerd-themed two-word name. Existing chosen names are preserved. Generated
and newly selected names must be unique after trimming and case folding. The migration
must stop if existing chosen names conflict rather than silently renaming them. The
assignment is serialized and guarded by the database unique index; no per-render generation.

The new-account/returning-account prompt uses:

> **Your Music Nerd user name**
>
> We picked **Aux Bandit** for you. This is the name others will see on your profile and contributions. Keep it or enter your own.
>
> **User name** — prefilled
>
> **Continue**
>
> You can change your user name anytime in your profile.

Continue saves/acknowledges the name even when unchanged and clears the reminder. Dismissing
records that the prompt was shown and leaves a compact reminder on the profile. The prompt
appears once per account, never blocks login or contribution actions, and replaces the
automatic wallet-link welcome; Link Wallet remains available from the account menu.
All username edits use “User name” in the profile. No email/wallet fallback is added.

Migration 0033 adds confirmation/prompt state and case-insensitive uniqueness. Before rollout,
run the reviewed backfill in the target environment to assign names only to accounts lacking
a chosen name, then verify mnweb read/write access. Production requires normal release approval.

Release order:
1. Verify the target database identity and inspect chosen-name conflicts (lower/trimmed,
   excluding blank/email/own-wallet names). Stop and resolve conflicts with their owners.
2. Apply `drizzle/0033_user_names.sql` through the authorized schema-owner connection.
   Verify the two columns, unique index and existing `mnweb` SELECT/UPDATE policies.
3. With the target application's `mnweb` environment, run
   `npx tsx scripts/release/assign-generated-user-names.ts` (dry run), then the same command
   with `--apply`. It logs counts only and rechecks each row under a lock, preserving names
   chosen while the backfill runs. Reruns skip already assigned names.
4. Verify no eligible accounts remain, chosen names were preserved, generated names have
   confirmation=true/prompted-at=null, and there are no duplicate public names. Exercise
   self-only reads/edits as the application role before deploying dependent code.
5. Repeat for production only as part of the approved release. Schema/backfill on staging
   does not mean production has been migrated or released.

Generation retries random word pairs on collisions. After 32 collisions it appends a numeric
suffix to the second word to keep allocation possible as the initial word pool fills.
The backfill does not open prompts itself; the next signed-in visit handles the prompt.
The prompt marker is stored before showing the dialog, so a lost response can skip the
one-time popup; the profile reminder still provides access. Failure to load or save never
blocks navigation or removes a contribution.

When Link Wallet restores a legacy account, a confirmed name chosen on the current
account moves atomically to the surviving account, including its confirmation state.
An unconfirmed generated name never replaces the legacy account's chosen name.
A prior dismissal is carried over so a merge does not repeat the welcome popup.

Account merges preserve existing activity attribution through the narrowly scoped,
audited transfer described in [account merge attribution](account-merge-attribution.md).
Ordinary name edits keep the same account ID and update past credits directly.

If allocation fails after identity verification (for example a transient database write
failure), authentication still succeeds with no public name in the session. Never use the
email or wallet as its public-name fallback. An internal pending JWT marker retries on the
next authenticated session request; role/account refresh continues even if allocation fails.
The welcome prompt becomes available once a generated name is saved successfully.

Public contribution notifications and leaderboard responses reject stored email/wallet-backed
names too, because the database row may still contain one while allocation is deferred.
They use “Anonymous” until a public name is saved. The public leaderboard also omits private
email/wallet values (returns null for those legacy fields); the Admin audit query is unchanged.
Lore keeps its existing “Contributor unknown” fallback for unresolved public identities.
