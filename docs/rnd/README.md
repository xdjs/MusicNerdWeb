# Music Nerd R&D

Shared context for the R&D work — decisions, notes, research, and the weekly meeting record.

This exists because context kept dying in chat threads. Agreed with Carl on 2026-08-20: keep it
in this repo as markdown, so any agent working in the codebase can read it without a separate
system to sync.

## What lives where

```
docs/rnd/
├── README.md              this file — the working agreement
├── decisions.md           one line per decision → links to the meeting
├── retro.md               keep / fix / try + open commitments
├── agendas/               _template.md + YYYY-MM-DD.md
├── meetings/              README.md index + YYYY-MM-DD.md + _template.md
├── events/                roundtable + showcase: concepts, run of show, recaps
├── research/
│   ├── inbox.md           links + one line on why
│   ├── _scratch/          GITIGNORED — Pete's raw notes
│   └── YYYY-MM-DD-topic.md
└── notes/
    ├── claude/
    └── codex/
```

| Path | What goes in it |
|---|---|
| `decisions.md` | One line per decision, newest first, linked to where it was made. Answers "what's our position on X" without reading every meeting in order. Open questions live at the bottom. |
| `retro.md` | Running keep / fix / try, plus open commitments and who owns them. Appended weekly, carried until closed. |
| `onboarding-fixes.md` | Dated findings and fixes from artist tests; use `MEMORY.md` for the active engineering queue. |
| `hybrid-onboarding-proposal.md` | Historical onboarding proposal; later meeting decisions and implemented behavior take precedence. |
| `agendas/` | Plans for upcoming R&D discussions. `_template.md` is the shape; an agenda is not evidence that a topic was decided. |
| `meetings/` | Synthesized outcomes, with source and date. See the [meeting index](meetings/README.md) for coverage. |
| `events/` | Roundtable and showcase: the concept and who's in the room, the run of show, and afterward what came out of it. |
| `research/` | Competitor teardowns, articles, threads worth keeping. `inbox.md` is the low-friction dump for links. |
| `research/_scratch/` | **Gitignored.** Raw notes and private source material for the working assistant. Promote only the durable, public-safe substance into committed notes. |
| `notes/claude/` | Claude's working notes — reasoning behind a decision, open questions, dead ends worth not re-walking. |
| `notes/codex/` | Codex / ChatGPT notes. Same idea. Separate so it's obvious which agent produced a line of reasoning when two disagree. |

`MEMORY.md` at the repo root keeps its existing job: engineering state (recently shipped, in
progress, backlog, known issues). This folder is the team-and-direction layer. Implementation
details belong in the relevant technical reference. Why we decided to build the thing at all
goes here.

Specs and implementation plans keep living in `docs/superpowers/specs/` and
`docs/superpowers/plans/`. Link to them from here rather than restating them.

**Artist test sessions:** findings go in `research/` as
`YYYY-MM-DD-artist-test-<name>.md` — what broke, what surprised them, what they said unprompted.
Raw session notes go in `_scratch/`. Only name an artist if they've agreed to it; the default is
initials or nothing. They agreed to try the product, not to a public writeup.

## What never goes in

`xdjs/MusicNerdWeb` is a **public repo**. Everything committed here is world-readable.

- **Raw transcripts are private by default.** On September 10, 2026, Pete explicitly authorized
  full verbatim transcripts of **Music Nerd Stand Up** and **Music Nerd R&D** to be publicly
  readable in this repository. Those exports belong in `transcripts/`; see the
  [automation setup](../../scripts/meeting-transcript-sync/README.md). This exception applies
  only to those two meetings. Other raw sources remain private or in ignored scratch.
- **No text threads, DMs, email lists, or contact data.**
- **Synthesize meeting notes; preserve authorized transcripts verbatim.** In synthesized notes,
  record the substance of a critique, not the quotable version of
  it. "Curated-listening subscriptions don't hold up without a personal connection to the
  curator" belongs here. However someone actually phrased it in the room does not.
- Synthesized public notes exclude personal or business situations outside the work. The two
  explicitly authorized transcript exports contain the full source text without editorial rewriting.

Attributing a decision to whoever made it is fine and useful — that's how decisions stay
accountable. The rule is about tone and raw material, not about naming people.

**The escape hatch is `research/_scratch/`.** It's gitignored, so nothing in it publishes. If
you're about to soften a thought so it reads well in public, put the unsoftened version there
instead. The working assistant reads it and promotes what's durable. The rule above should never
cost us the thought itself — only where it lands.

## The meeting loop

1. Prepare an agenda for the next R&D discussion using `agendas/_template.md`. Read the week's
   engineering handoff, relevant commits, decisions and outstanding commitments. In runtimes
   with an `/agenda` command it can help; other assistants use these files directly.
2. After a meeting, read the available source notes/transcript and synthesize
   `meetings/YYYY-MM-DD.md` using the existing format. Add a descriptive suffix if separate
   sessions on the same day need separate records. Use source timestamps to distinguish them.
3. Record settled decisions in `decisions.md`, link their meeting evidence, and update retro
   commitments only when a later source supports the new status. Mark proposals and unknowns.
4. During the week, record changes in direction when they happen. Keep raw material private
   and promote only its durable, work-related substance.
5. Pete coordinates agenda/retro sharing. Sending email or Discord messages is a separate
   action requiring authorization; maintaining these notes does not authorize it.

The August 27 meeting introduced daily standups and separate retrospectives. The September 7
meeting moved that week's Thursday demo to 11:00 AM Eastern in place of the standup. Check the
calendar for current times; neither the original 10:00 AM nor a later one-week adjustment is a
permanent schedule. Keep the repository's weekly meeting record distinct from scheduling.

## Original meeting flow — August 20

Historical format: the August 27 decision moved the retro to its own meeting.

60 minutes. Open to people in our network as observers; the AMA is open for everyone.

| | | |
|---|---|---|
| 1 | Vibe check | 0:00–0:05 |
| 2 | Agenda — demo first, then 3 topics (Pete leads) | 0:05–0:32 |
| 3 | Planning for next week (Pete leads) | 0:32–0:42 |
| 4 | Keep / fix / try (CY or Carl leads) | 0:42–0:52 |
| 5 | AMA (CY leads) | 0:52–1:00+ |

The demo at the start and the generated agenda are both retained items from the 8/20 retro.

The retro moved from 0:51 to **0:42** and from five minutes to ten — CY's fix from 8/20 was that
it kept getting squeezed against the end of the call, and on 8/20 it got squeezed out entirely
and happened over text afterward. The agenda block absorbed the cost.

Shape of a good agenda, learned from the first one: every topic carries a time budget, three to
five sharp questions, and a stated goal. The questions are what let people arrive with a position
instead of forming one live. Three or four topics maximum — more than that and nothing gets
decided. See [`agendas/_template.md`](agendas/_template.md).

## Email

Recipients live in `recipients.md`, which is gitignored — contact data doesn't go in a public
repo. Pete reviews and sends any authorized drafts.

## Branching

All documentation follows the branch and release rules in [CLAUDE.md](../../CLAUDE.md): feature
branch → staging → main, with the existing review/authorization gate. The August 20 permission
for docs-only commits directly to main is historical and does not override current practice.
The suggestion to remove staging was not adopted in the current guide.
