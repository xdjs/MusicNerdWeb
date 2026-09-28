# Lore attribution and About

Tracking: [#1371](https://github.com/xdjs/MusicNerdWeb/issues/1371).

## About contract — September 28, 2026

A normal `GET /api/artistBio/:id` reads the stored About. If none exists it returns the existing empty-state text. It never generates text, searches, inserts sources or checks pending sources to self-heal. Reading an unclaimed profile is not a research trigger.

An editor’s explicit regeneration (PUT or the legacy authenticated `GET ?regenerate=true`) summarizes the saved `artist_docs.content` and uses that document’s citation manifest, through the same `generateAboutFromDoc` helper as onboarding. It does not fetch platform statistics, catalogs, encyclopedias or pending source links. Pinned bios remain pinned; the existing ownership-generation and concurrent-edit checks still protect persistence.

If no nonempty Lore document exists, generation returns an actionable missing-Lore error and does not overwrite an existing About. Research/building Lore is a separate operation. Onboarding can still build Lore and then synthesize About from that document; changing About does not launch onboarding or social ingestion.

Source provenance and Admin research history are the next implementation slice on this tracker. Historical source rows cannot reliably identify a submitter from creation time or current claim ownership.
