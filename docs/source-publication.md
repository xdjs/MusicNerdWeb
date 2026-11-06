# Source publication without artist ownership

Local candidate for MusicNerdWeb #1424; not deployed. Source publication is a separate decision from contributor provenance, moderation, artist ownership and onboarding.

`artist_vault_sources.publication` has three values:

| Value | Approved source behavior |
| --- | --- |
| `inherit` (default) | Preserve prior claim-dependent Lore access; unclaimed destination links retain their existing stripped projection. |
| `public` | Permit public source discovery and original reading even before the artist claims the profile. |
| `private` | Exclude the source from public Lore/chat even if the profile is claimed. Authorized editors retain review access. |

Pending/rejected sources are never made public by this setting. Existing rows default to `inherit`; there is no blanket publication backfill. Historical `origin` and activity records are unchanged. A present-day statement about an old upload is not a fabricated historical database event.

An authenticated administrator can call `setSourcePublicationAction` for one approved source, supplying its expected update timestamp. The server derives actor identity from the authenticated session, locks/rechecks the admin role and artist/source, rejects a changed revision, changes publication and update timestamp, and records an activity event in the same transaction. No audit event is invented for a no-op. Audit failure rolls back the decision. This action does not claim the artist, confirm onboarding, refresh Lore, queue research, or notify anyone. No new public HTTP API or general impersonation capability is added. Administrators see an explicit publication selector and Save button on approved sources in the existing Lore editor. Claimants and whitelisted contributors do not receive this control; the server independently verifies admin access.

Public artist props never carry `extractedText`. API discovery/read eligibility uses the matching policy and revalidates source revisions. The artist's later claim and first-generation/tour flow remain unchanged: publication is not proof that onboarding happened. Publication alone grants no artist-edit rights.

**Privacy boundary:** `private` means excluded from the affected public UI/chat paths. Existing `vault-files` objects are public URLs; this setting does not encrypt them, revoke known URLs, erase generated biography/Lore text, alter independent external links, or recall content previously sent to providers. Do not promise storage privacy or retroactive erasure. A storage/privacy redesign would be separate work. Publication of an upload requires an explicit content-publication decision; current contributor trust is not sufficient evidence for historical upload consent.

## Migration and release order

Apply `0060_source_publication.sql` through separately authorized migration procedure before deploying either API or Web code that selects the new column. It adds a default and check constraint on the existing table, without changing grants/RLS or touching source status, text, provenance, claim or onboarding rows. Existing application table grants/policies still apply; mutation authorization remains application-enforced. PGlite tests exercise migration defaults/constraint and the SQL action/audit transaction, but do not establish live `mnweb` grants or production migration history. No live migration was run.

Deploy corresponding API eligibility changes alongside Web projection changes. Old deployments do not understand `private`; do not make a private decision while old public readers remain live. Rollback code must account for already-made public/private decisions; dropping the column is not a safe visibility rollback. Keep the migration when rolling application code back until a reviewed policy-preserving rollback exists.

**Mutation gate:** do not make any public/private publication decision until both API and Web readers are deployed at verified compatible revisions. Verify public server projections omit the entire private source row (including title, URL and file path), API discovery/read rejects it, and the affected artist page is invalidated after a successful change. The action calls `revalidatePath` for that artist; chat responses use `private, no-store`. Local tests prove projection omission and the invalidation call, not CDN/browser cache eviction in a deployed environment. Verify those deployed surfaces before permitting decisions. Already-delivered pages, known file URLs and historical generated documents cannot be recalled by this invalidation.

**Rollback gate:** once private decisions exist, never roll back to an old reader that ignores this column. Keep policy-aware readers available or prepare a separately reviewed fail-closed rollback. Merely retaining the database column does not make old readers safe. No automatic visibility reset or destructive source removal is part of this change.

## Verification limits

Provider-free tests cover public/unclaimed and inherited/claimed projections, private/pending/rejected exclusion, source-body stripping, authenticated action identity, role checks, stale revision, audit rollback, migration policy values, and absence of claim/onboarding/job writes. They do not prove autonomous model accuracy, live PDF processing, deployed permissions, or browser interaction. No live source was published or hidden.

## Trusted-contribution integration

The revocation integration additionally treats approved inherited sources as publicly eligible when their own immutable activity event matches source ID, artist ID, user actor, origin/action and `trusted_submission` trigger. This uses submission-time evidence, never today's role or inferred legacy trust. Explicit private publication and pending/rejected moderation still exclude the source. It is an eligibility rule, not a database backfill or a grant of artist-edit authority.

Independent trusted file contributions use signed, append-only Lore authority and durable actor-bound completion receipts. See `claim-revocation-retention.md` for endpoint behavior, retry/deletion semantics, Web access boundaries and remaining generation/storage release gates. #1655 Lore/About integration is not claimed complete here.
