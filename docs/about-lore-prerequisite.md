# About regeneration and Lore preparation

The explicit authenticated Regenerate About request prepares the stored Lore document before generating About when the document is missing or a normal Lore refresh is pending. A current document with no pending refresh is reused. Read-only profile requests do not generate anything.

Preparation uses the existing `lore_refresh` job slot and lease, not onboarding or social research. Pending ordinary refresh jobs are reused. Other purposes and jobs owned by another running worker are never stolen: the request waits briefly for completion, then reports that preparation is still in progress and preserves About. Sources changed during a rebuild remain queued and must settle before About is regenerated.

Only the existing approved, readable Lore material is eligible. Adding a URL alone does not make it citable. If extraction/review has not yielded readable material, the response explains that requirement. This action never starts extraction or a full research run.

Claim and editor authorization are checked before taking the job, again when saving its Lore, and by the existing About writer. Pinned bios are unchanged. Concurrent edits and ownership changes retain existing conflict protection. A Lore failure does not start About generation; an About failure preserves the saved About and may leave successfully prepared Lore available for retry.

Local provider-free tests establish orchestration and database lease behavior. They do not establish live provider latency, output quality, production RLS or browser acceptance.
