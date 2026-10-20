# Composite artist share proposal

October 20, 2026 — proposed under #1579; owner approval pending.

Large public portrait (or pink record motif), artist name, Music Nerd, and the existing
“The music is only half the story.” copy. Contract: [artist-share-preview](../../../artist-share-preview.md).
The preview-only gallery at `/dev/artist-share-preview` includes normal/logo, missing,
long-name and unsupported-glyph examples. Full names remain in page metadata.

Independent code review found dynamic emoji/font requests could break rendering;
network-independent neutral text and a render retry resolved it. Independent design
review found the proposal readable, with smaller long-name text at message-bubble
width and a need to review real portrait crops. Square crops and native iMessage
layout remain an acceptance check. This is not owner approval.

Existing saved images with another artist UUID in their object filename are omitted
by the conservative eligibility rule (observed for the copied Dutchyyy staging image).
Owner review should consider that tradeoff alongside the international-name fallback.
Screenshots and exact-commit verification belong on the draft PR, not this branch.
