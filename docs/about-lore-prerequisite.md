# About regeneration and Lore preparation

The explicit authenticated Regenerate About request prepares the stored Lore document before generating About when the document is missing or a normal Lore refresh is pending. A current document with no pending refresh is reused unless the eligible vault inventory or its saved evidence revisions differ from the manifest (including legacy manifests without revisions). Read-only profile requests do not generate anything.

Preparation uses the existing `lore_refresh` job slot and lease, not onboarding or social research. Pending ordinary refresh jobs are reused. Other purposes and jobs owned by another running worker are never stolen: an overlapping request immediately reports that generation is already in progress and preserves About. Sources changed during a rebuild remain queued and must settle before About is regenerated.

Only the existing approved, readable Lore material is eligible. Adding a URL alone does not make it citable. If extraction/review has not yielded readable material, the response explains that requirement. This action never starts extraction or a full research run.

Claim and editor authorization are checked before taking the job, again when saving its Lore, and by the existing About writer. Pinned bios are unchanged. Concurrent edits and ownership changes retain existing conflict protection. A Lore failure does not start About generation; an About failure preserves the saved About and may leave successfully prepared Lore available for retry.

Local provider-free tests establish orchestration and database lease behavior. They do not establish live provider latency, output quality, production RLS or browser acceptance.

## Freshness and failure protection

Vault manifest entries now carry a digest of the saved evidence fields. Missing legacy digests, same-URL changes, removed or rejected sources, and newly readable approved sources require rebuilding. The API checks the complete eligible vault inventory under the artist lock; all approved source rows are also share-locked to cover older Web edits/deletes that bypass the artist lock. A strict read failure stops generation instead of appearing to be an empty inventory.

Before publishing Lore, the API revalidates both that inventory and the job's full-precision `claimed_at` lease plus `requestedAt`. Before publishing About, it revalidates the exact document and its vault inventory. A conflict returns 409 and preserves About. Cleanup releases only the acquired lease, preserves a newer refresh request, and retries cleanup after unexpected rejection or settlement failure. If storage also prevents cleanup, the response explains that lease recovery may take a few minutes.

Explicit About regeneration has a 45-second budget measured from handler entry, including authentication time, and combines it with client cancellation. Cancellation reaches Lore, inventory-summary and About model calls and Spotify catalog HTTP requests. It rejects aborted partial streams and checks cancellation around persistence. Short reservation, persistence and cleanup transactions use transaction-local 2-second lock and 5-second statement timeouts. Pool waits, authentication, unfenced reads and commit handling remain outside a hard end-to-end bound; therefore this does not establish a guaranteed 60-second route response. Verify route latency and abandoned-lease recovery before release. A durable queued About action would be a separate solution if measured latency exceeds the route budget.

The new freshness digest covers vault evidence. Interview/social/correction invalidation continues to use existing refresh scheduling; this change does not introduce a revision system for every research input. Explicit regeneration holds the ordinary Lore lease through About generation, even for an already-current document. The exact lease and refresh marker are revalidated and settled in the same transaction as the About write. About failure releases completed Lore without counting a Lore failure; newer invalidations remain queued. Abandoned leases use existing worker recovery, which rebuilds Lore but never automatically retries About. Completed About-only leases do not impose a manual Lore-rebuild cooldown; worker reclamation clears that marker before an actual rebuild.

## Integration required before release

This isolated branch predates the separate trusted-contributor/publication candidate. Its gathering and freshness predicates currently use approved citable vault rows, not the candidate's public/private policy. Integrate the same eligibility predicate and publication revisions at gathering, document reuse and both persistence boundaries before release; private evidence must not enter public output. Whitelist status does not itself grant artist-edit or onboarding authority.

For unclaimed artists, the current public About read uses directory preparation rather than the ordinary saved bio. Saving an admin-generated About is not proof it becomes publicly visible. The public About publication/projection contract must be resolved with the trusted-contributor work.

The About action does not reset research or delete UGC. Existing claim-build reset removes research-origin vault sources and retains submissions/uploads. Claim revocation currently deletes all vault sources in Web; that separate destructive lifecycle cannot be described as preserving trusted UGC across ownership transitions. Claim/onboarding acceptance must exercise real transition paths with synthetic data after policy integration.
