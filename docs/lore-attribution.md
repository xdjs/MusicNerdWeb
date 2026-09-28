# Lore attribution and About

Tracking: [#1371](https://github.com/xdjs/MusicNerdWeb/issues/1371).

## Revised delivery plan — September 28, 2026

Pete identified that removing research from About alone leaves unclaimed artists without a new-bio path while Lore only consumes human-approved sources. The [revised plan](https://github.com/xdjs/MusicNerdWeb/blob/codex/lore-attribution-admin/docs/lore-provenance.md) separates automatic source acceptance from human review and adds an attributed research → eligible sources → stored Lore → About pipeline for unclaimed artists. Claiming governs artist control, not bio eligibility. This is planned work, not implemented by this About fix. The current PR remains a foundation; the coordinated production rollout must include and verify the unclaimed-profile path. Existing/pinned/manual bios remain protected and unknown historical actors remain unknown.

## About contract — September 28, 2026

A normal `GET /api/artistBio/:id` reads the stored About. If none exists it returns the existing empty-state text. It never generates text, searches, inserts sources or checks pending sources to self-heal. Reading an unclaimed profile is not a research trigger.

An editor’s explicit regeneration (PUT or the legacy authenticated `GET ?regenerate=true`) summarizes the saved `artist_docs.content` and uses that document’s citation manifest, through the same `generateAboutFromDoc` helper as onboarding. It does not fetch platform statistics, catalogs, encyclopedias or pending source links. Pinned bios remain pinned; the existing ownership-generation and concurrent-edit checks still protect persistence.

If no nonempty Lore document exists, generation returns an actionable missing-Lore error and does not overwrite an existing About. Research/building Lore is a separate operation. Onboarding can still build Lore and then synthesize About from that document; changing About does not launch onboarding or social ingestion.

Source provenance and Admin research history are the next implementation slice on this tracker. Historical source rows cannot reliably identify a submitter from creation time or current claim ownership.
