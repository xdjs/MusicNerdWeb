# Artist feedback — 2026-08-24

Present: Pete and an artist participant; participant details are omitted from this public recap.

Source: Gemini meeting notes, reviewed 2026-09-09.
[Original notes (team access)](https://docs.google.com/document/d/1dc-JCEEA05AvbIkZffbxnLCW3jAxzscDKQG-YBOKq9g/edit).
Synthesized for the public repo; plans below are not proof of implementation.

Guided onboarding exposed fragmented artist identities and a missing regional press archive.

---

## The onboarding test

The participant claimed a profile on staging with Pete assisting and approving the claim during
the call. The system found a Spotify profile and produced a knowledge document. This exercised
an older onboarding build and was not a cold test of the later claim-to-profile flow.

## Identity and source preservation

Searching surfaced punctuation variants and compound artist entries from past collaborations.
A single person can therefore be represented by several catalog entities. This requires a
considered claim/identity design; matching names is not enough to authorize automatic merging.

A regional news archive had disappeared, taking much of the artist's written history with it.
Pete proposed durable archival approaches, including on-chain publication. The source summary
labels that as a decision, but the existing research leaves storage, provenance and publication
rights unresolved. Treat it as an exploration, not an approved storage implementation.
See the [contemporary research](../research/2026-08-24-identity-fragmentation-and-link-rot.md).

## Next

The discussion explored audience interaction during live-show changeovers as a separate
application over music data. Pete would investigate missing archives and the participant would
provide examples for further testing. Ongoing email interviews were an idea here; the August 27
team decision selected chat for the initial interview delivery.
