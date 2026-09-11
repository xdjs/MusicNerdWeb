# Decision log

An **index**, newest first. One line per decision plus who made it. The reasoning lives in the
meeting notes — follow the link. Don't restate it here; two copies of the same decision drift.

A line goes here when something changes what we build or how we work. Still open? Bottom of the
file. Meeting decisions record intent at that date, not implementation or deployment. Current
engineering state and working rules live in [MEMORY.md](../../MEMORY.md) and
[CLAUDE.md](../../CLAUDE.md).

---

## 2026-09-11 · Pete's local profile review

- Unpin only unlocks the current bio; regenerate requires a separate explicit click. — Pete
- Latest release details offer supported services where release links are available, with logos; artist-page links stay separately labeled. — Pete

- Match Claim/Edit and primary profile buttons to Add Link: solid pink, black labels/icons, consistent rounded corners and interaction states. — Pete, citing Om

- Keep one expandable biography in the hero; remove About under Lore and strengthen the portrait fade. — Pete
- Listen opens a dark glass picker of saved music services, with unboxed logos and clean rows; exclude In Process as it is not a listening destination. — Pete
- Remove Read the story for now; revisit its purpose Monday, September 14. — Pete
- Reorder by dragging the link icons; profile Done saves ordering, with no separate Save order control. Links appears above Lore. — Pete
- Use a glass bio editor and one Save that also archives the edited bio in Lore; remove Save to Lore. — Pete

## 2026-09-11 · [Stand Up transcript](transcripts/2026-09-11-standup-ab5db51a596c.md)

- Combine Timeline into Latest, including In Process moments alongside other activity. — team, 13:25
- Keep artist search easy to reach from the redesigned profile. — Pete, 17:21
- Pete owns profile design/Latest; Sweetman owns the initial read-only In Process integration.
  This supersedes yesterday's temporary pause on Pete's design work. — Pete, Sweetman, 21:23–22:12
- In Process upload/writeback is later work; initially favor a distinct Music Nerd collection,
  with artist-selectable collections left for exploration. — team, 14:11–15:53, 22:12
- Keep Exa quality and make the research provider replaceable. — Carl, Sweetman, 19:30–20:38

No explicit A/B/C selection was recorded. Floating Ask was feedback; the precise placement
remained an implementation choice under Pete's design ownership. Pete's later review
above supersedes the initial About placement.

## 2026-09-10 · [R&D](meetings/2026-09-10.md)

**Product**

- Saving the About bio pins it by default; older versions re-pin from history. — Carl, Pete
- Collapse "save" and "save to lore" into one save. — Pete
- Remove the bookmark button from artist profiles; revisit bookmarks in the user-profile
  redesign. — CY, Carl, Pete
- Sweetman's first feature: display an artist's music NFTs on the profile using In Process's
  existing index and API, no new indexing. Scope set Monday with Pete. — Carl, Sweetman

**How we work**

- Any non-author can approve a staging-to-main merge; Carl to verify the ruleset. — Carl
- Pete pauses artist-profile changes until 2026-09-14 while Sweetman reviews. — Pete

## 2026-09-09 · [kickoff](meetings/2026-09-09-kickoff.md)

- Sweetman's first phase is the research pipeline: audit both apps' research, compare Exa and
  Tavily, solidify the claim-triggered agent, then Latest with a reindex cron. — Pete

## 2026-09-09 · [standup](meetings/2026-09-09.md)

- Pete coordinates Patrick Sweetman's onboarding and agrees useful first tasks with him. The
  meeting did not assign feature ownership; Pete subsequently requested the docs cleanup. — team

## 2026-09-08 · [standup](meetings/2026-09-08.md)

- Log artist feedback and choose fixes without promising every request. — Carl, Pete, CY
- Continuous backups were deferred at this meeting; investigate the missing biography through
  an isolated restore. A human-edit lock was proposed, not confirmed implemented. — team

## 2026-09-07 · [standup](meetings/2026-09-07.md)

- Use compact mobile constraints to guide the next artist-profile design iteration. — Carl, Pete
- That week's Thursday demo moves to 11:00 AM Eastern and replaces the standup; the community
  session remains separate. Check the calendar for ongoing scheduling. — team

## 2026-09-04 · [standup](meetings/2026-09-04.md)

- Try a shared repository-context agent with Hermes and a dedicated channel. An auxiliary
  experiment, not a required web-app dependency or proof of a running service. — Carl, Pete

## 2026-09-03 · [R&D](meetings/2026-09-03.md) · [design review](meetings/2026-09-03-profile-design.md)

- Focus the next design work on the artist profile, targeting an improved release by the end
  of September. — team
- Rename the artist-facing Vault section to **Lore**. Internal code/schema names are separate. — team
- Place Latest after About as the initial design direction and make the artist's answers
  visible. Longer-term profile layout remains under iteration. — Pete, Tom, Carl, CY

## 2026-09-02 · [standup](meetings/2026-09-02.md)

**Product**

- Artist profiles and user profiles stay **separate notions** for now. SoundCloud merges the two;
  we're not doing that initially. — Carl, Pete
- A **latest-activity section** on the artist profile, surfacing the answers artists give to
  interview questions. These become the "nuggets" MNTv draws on, shown next to the artist's social
  updates with a call to action back to the source post. Implementation status is in
  `MEMORY.md`. — Carl

**How we work**

- **Releases:** reviewer green light → Pete tells Carl → Carl merges `staging` to `main`. Squash,
  as recorded at the time; verify the current GitHub ruleset before release actions.
- **Agents must write tests for each new feature.** Raised by Carl after a week where staging
  caught failures the local suite had missed. — Carl

## 2026-09-01 · [standup](meetings/2026-09-01.md)

- Preserve inactive projects by archiving them and propose a clearer Discord structure. — team
- Try turntable.fyi before making further integration decisions. — team

## 2026-08-31 · [standup](meetings/2026-08-31.md)

- Present one main social account per artist for now; revisit additional-account UI when
  artist feedback warrants it. This is not a bulk-deletion or identity-merge instruction. — Carl, Pete
- Keep standups brief: check-in, yesterday/today, availability. — Carl, Pete

## 2026-08-27 · [R&D](meetings/2026-08-27.md)

- Prioritize underground artists; big-name artists are a non-goal for this stage. — Carl, CY
- Deliver the initial interview in chat, not an email cadence. — team
- Defer contribution mechanics beyond links while profile claiming is the focus. — Carl
- Use domain credibility in source judging and make profile/knowledge content readable by
  crawlers. Verify actual access rather than assuming client-rendered content is available. — team
- Finish profile claiming before MNTv integration. — Carl, Pete
- Separate retrospectives from R&D and start daily 15-minute standups. Later scheduling updates
  supersede the original time. — team

## 2026-08-24 · [showcase planning](meetings/2026-08-24-showcase-planning.md)

- Start with an every-other-week showcase incorporating feedback/discussion, using Riverside
  as the preferred recording platform. This revises the August 20 monthly format. — Pete, Black Dave

## 2026-08-21 · [artist test](research/2026-08-21-artist-test-pharaoh.md)

**Product**

- An artist's own website is surfaced beside Links on the profile, not buried in the vault —
  stored as an approved vault source of type `website`, no schema change. — Pete
- "Social Links" is renamed "Links". — Pete

**Open questions this raised** (below)

## 2026-08-20 · [meeting notes](meetings/2026-08-20.md)

**Onboarding** — [reasoning](meetings/2026-08-20.md#decisions)

- Renaming "Social links" just "Links" seems more fitting for the time being.
- Collapse the flow to one assertion, then the profile; enrichment moves to affordances on the
  profile page. — Carl
- The one assertion is a social handle, not Spotify. — Pete
- Pre-select confident single matches. Where several candidates exist for one platform, don't
  surface them to be unchecked — let the artist add the right one. — CY
- Artists don't edit Markdown. Ship the current knowledge-document screen, redo the presentation
  later. — Carl
- Product copy says "Music Nerd," never "AI." — CY
- Artist tests run cold — no coaching, no narration. — Carl, CY
- The bar: the artist comes out feeling seen in a way they didn't realize they could be
  perceived. — CY

**Engineering**

- Every new artist gets a best-effort Spotify ID at creation, independent of onboarding. — Carl

**How we work** — [reasoning](meetings/2026-08-20.md#shared-context-in-the-repo)

- Shared context lives in this repo as markdown, not a separate system. — Carl
- Docs-only direct-to-`main` permission was given then. **Superseded by current operating
  practice:** docs follow feature → staging → main and the release gate in `CLAUDE.md`. — Carl
- The retro moves to 0:42 with ten minutes, from 0:51 with five. — from the retro

**Direction**

- Music Nerd doesn't tell you what to listen to; it deepens your relationship with music you
  already love. — Carl
- Show the scope of an artist's world on arrival; drilling into it is a separate problem. — CY

**Events** — [reasoning](meetings/2026-08-20.md#roundtable--showcase)

- Originally monthly roundtable and showcase; **revised by August 24 showcase planning** and
  subsequent Feed Forward scheduling. — team
- Record in Riverside. — Pete, endorsed
- Invites go to the Music Nerd email list from Jade. Approved. — CY

---

## Questions resolved or narrowed since August 21

- **Where do answers appear?** September 2 chose Latest. The implementation and its release
  limits are in [Latest](../artist-latest.md) and `MEMORY.md`.
- **When are interview questions asked?** They are opt-in from the profile, with repeat sittings
  gated by new research. See [onboarding fix 5](onboarding-fixes.md#5-the-interview-should-be-opt-in-and-repeatable-done).
  A future email path remains undecided.
- **How is Instagram research triggered?** The earlier CLI-only observation is obsolete.
  Existing durable research jobs handle ingest/extraction and readiness; see
  [onboarding fix 6](onboarding-fixes.md#6-caption-extraction-needs-a-durable-job-not-a-request-callback-done).
- **Must onboarding remain long?** The team proceeded with the collapsed/profile-review
  direction. The early artist test remains evidence for future usability work, not an open
  instruction to reverse the implemented flow.

## Open

Raised, not settled. Move up into a dated section when they close.

- **Drop the staging branch?** Historical proposal from August 20, not adopted in the current
  guide. All work, including docs, continues through staging. Revisit only as an explicit team
  workflow decision.
- **Longer-term profile editing and layout.** August 20 proposed a wizard/per-section
  comparison; September 3 reviewed a working wizard and September 7 reopened the mobile
  layout. No final redesign was selected. Follow the current design task, not a blanket
  instruction to build both. See [design review](meetings/2026-09-03-profile-design.md).
- **How should citations appear beside artist edits?** The August 20 presentation question
  was unresolved. It does not override the current requirement to preserve provenance and
  real source URLs in stored research. Decide the presentation without discarding evidence.
- **Does the artist want editorialising or transcription?** Pharaoh asked for "an editorial
  version" of what he typed rather than it being handed back verbatim. That is the exact
  behaviour the About's "mine, don't summarize" mandate and factual voice were built to prevent,
  after the Black Dave conflation. Both positions are defensible; the line between shaping and
  inventing needs drawing deliberately. *(8/21)*
- **What should ongoing social refresh cost and how often should it run?** The August 22
  question about scraping inside onboarding predates the durable-job implementation. Keep
  the existing job path; future refresh cadence and image retention remain separate product
  decisions. See [Latest limits](../artist-latest.md#known-limits-and-next-decisions).

- **How does one human hold several DSP artist profiles?** Sherwinn "Dupes" Brice has four Deezer
  entities and can claim one — compounds minted before multi-primary-artist support ("X & Hebrue")
  plus punctuation variants. `artists` holds one spotify and one deezer id per row, so there is no
  representation for it. Detection is easy; auto-merging is the name matching that produced three
  wrong-artist incidents in a week. Proposal is to ask at claim time and claim all in one action.
  Written up in [research](research/2026-08-24-identity-fragmentation-and-link-rot.md). Raised by
  Pete. *(8/24)*
- **How do we preserve a source after its publisher goes offline?** loopnews.com went down and took
  much of the Caribbean scene's written record with it. We now store article text, so a dead URL no
  longer empties a profile — but only for captures since 8/22, and we have no liveness check, no
  content hash and no independent copy. Pete raised blockchain; the split worth deciding is storage
  (database/Arweave) versus tamper-evident timestamping (hash on-chain), and what may lawfully be
  republished permanently versus held internally. Same
  [research](research/2026-08-24-identity-fragmentation-and-link-rot.md). *(8/24)*

- **How relationships in the database become explorable** — what counts as an edge, whether edges
  weigh equally, verified vs. inferred vs. artist-described. On the 8/20 agenda, never reached.

- **Do long-running research jobs need a server of their own?** The application’s research
  route uses a 60-second invocation budget. The September 2 discussion described Instagram
  scraping and extraction taking minutes, depending on the feed. Running it inside the
  onboarding request meant the platform cut it off partway and the artist's credits never arrived.
  The current answer is `artist_research_jobs` plus a once-a-minute cron that takes as many slices
  as fit in an invocation and leaves a cursor behind — the work survives the request, at the cost
  of a queue to maintain and completion arriving minutes later. A dedicated worker would remove the
  time limit and the slicing, and add infrastructure we do not otherwise run. Not urgent while
  volume is low; the thing to watch is whether artists wait noticeably for a profile. Raised by
  Carl. *(9/2)*
