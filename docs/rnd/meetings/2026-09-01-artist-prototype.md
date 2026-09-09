# Artist prototype workshop — 2026-09-01

Present: Pete and an artist collaborator; participant details are omitted from this public recap.

Source: Gemini meeting notes, reviewed 2026-09-09.
[Original notes (team access)](https://docs.google.com/document/d/1koZET7QBjccC-IbwroNMkkImAkty8YoGX7Ih4Asyl6Y/edit).
Synthesized for the public repo; plans below are not proof of implementation.

A workshop to turn the live-show changeover idea into the separate Money Pull Up prototype.

---

## Scope and separation from MusicNerdWeb

The prototype lets an audience join by QR code and vote on music during event changeovers.
The workshop set up a separate repository and PRD, using Between Sets as a reference and
Cloudflare as the intended deployment platform. Those choices do not change MusicNerdWeb's
stack, infrastructure or onboarding requirements.

## The experience discussed

Use curated Caribbean music from an event-specific YouTube playlist. Audience members can
join with little friction, vote and request songs; a stage display reveals the winner. The
workshop covered session restoration, producer controls, sponsor visuals, analytics, branding,
automatic rounds and a shareable end-of-event playlist. Music purchasing was excluded.

Some summary details conflict: one section lists three voting choices while another describes
five. The prototype's PRD must settle that contract. The source mentions a September 12 test;
the September 2 standup instead names September 11 for readiness. Confirm the event deadline
with the project owner rather than copying either date into a new task.

## Next

The collaborator: consolidate the requirements, prepare a test playlist and push the prototype.
Pete: help with tooling and review the resulting build. This note preserves the cross-project
context; its feature list is not MusicNerdWeb's backlog or proof of prototype completion.
