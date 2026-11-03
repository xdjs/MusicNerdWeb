# Research in place

Tracked on [#1365](https://github.com/xdjs/MusicNerdWeb/issues/1365). This is the contract for
what a newly claimed artist sees while research builds their page: **their own profile page**,
under the app's nav, with each section that research fills showing a loading state until its step
is confirmed. The approved design is linked from the issue.

> **Decision 2026-09-25 ([standup](rnd/transcripts/2026-09-25-standup-d78e77f0716b.md); Carl, Pete,
> Sweetman): paint the profile in place.** This supersedes the full-page research view from
> [#1347](https://github.com/xdjs/MusicNerdWeb/issues/1347), which slice 1 of #1365 deleted
> (`ResearchView` and the components and `src/lib/onboarding/` functions only it used).

> **Decision 2026-10-03 (Sweetman): the page reads build progress from MusicNerdAPI, not from the
> chat stream.** The build confirms each step in `artist_onboarding_steps` as it finishes, and the
> server finishes the build even if the browser leaves. The page reads that state through
> MusicNerdAPI's public `GET /api/onboarding/{artistId}/state`
> ([docs](https://docs.musicnerd.net/api-reference/onboarding/state)), not the database.

> **Decision 2026-10-08 ([R&D sync](https://github.com/xdjs/MusicNerdWeb/issues/1464); Pete,
> Sweetman): no "Your page is ready" card.** Its **See what we found** only scrolled to a
> hard-coded section, and the tour already opens on completion. When research completes, the
> status (now the progress pill) goes away and the tour takes over. Tracked on
> [#1464](https://github.com/xdjs/MusicNerdWeb/issues/1464).

> **Decision 2026-10-08 ([R&D sync](https://github.com/xdjs/MusicNerdWeb/issues/1464); Pete,
> Sweetman): research scrolls by itself, until the artist scrolls.** Pete asked for a way to
> follow the build without knowing to scroll; Sweetman proposed following by default and stopping
> once the artist scrolls; Pete: "that's perfect". This narrows the earlier "nothing scrolls by
> itself" rule to the tour.

> **Decision 2026-10-09 (Sweetman): nothing scrolls by itself during the build; a progress pill
> instead.** Being moved around the page was jarring. Like the jump-to-latest arrow in ChatGPT and
> Claude, a pill shows the progress and takes the artist to the research only when they click it.
> This supersedes the 2026-10-08 follow decision above. Tracked on
> [#1476](https://github.com/xdjs/MusicNerdWeb/issues/1476).

> **Decision 2026-10-14 (Sweetman): no editing while research runs.** Pete found that **Add to
> Lore** opened Lore's editor mid-build, with saved sources under the placeholder. Rather than make
> the editor research-aware, the build hides the two ways into edit mode, the **Edit** toggle and
> **Add to Lore**, until research is complete; they return with the refresh that ends the build.
> Supersedes draft #1512's editor approach.

> **Correction 2026-10-14 (#1508/#1515 integration verification): editing follows the
> active build view, not incomplete setup.** `ResearchInPlace` supplies the existing
> `OnboardingProgressContext`; Edit and Add to Lore are hidden only while that context reports
> an unfinished build. Leaving the build, resuming source-review cards, or choosing Skip for now
> restores editing even if setup is incomplete. Completion restores controls immediately without
> waiting for a server refresh. An already-open Lore editor is hidden and made inert during the
> build while its mounted tabs and unsaved drafts are retained. The same derived edit context
> suspends link removal/reordering, About and photo controls, and existing editing dialogs;
> pending About text, photo choice/crop, and link order are not saved or discarded. This does not change Ask/chat,
> permissions, persistence, source approval, or worker behavior.

> **Decision 2026-10-14 (stand-up): Lore shows only its placeholder during the build.** In the
> 2026-10-13 test, Lore showed the skeleton and the sources that already existed. Until the `vault`
> step is confirmed, the skeleton replaces the existing sources, as it does the About. Links is
> unchanged.

> **Decision 2026-10-14 (stand-up): the tour opens at the section it describes.** In the
> 2026-10-13 test the build finished with the artist at the bottom of the page, and the tour's
> About card opened with About off screen. The tour should always be next to the section it is
> calling out, so opening it scrolls to that section. This supersedes the 2026-10-06 rule (#1435)
> that opening the tour keeps the reader's position; the build itself still never scrolls on its own.

> **Decision 2026-10-09 (Sweetman): no "skip for now" during the build.** Skip only ever hid the
> page's progress (the build carries on server-side); the pill covers nothing, so there is nothing
> to skip. The step-card modal keeps its "Skip for now". Tracked on
> [#1476](https://github.com/xdjs/MusicNerdWeb/issues/1476).

> **Decision 2026-10-12 ([stand-up](https://github.com/xdjs/MusicNerdWeb/pull/1490); Pete, Carl,
> Sweetman): one voice.** In Pete's live test the About said "writing your about…" while the pill
> said it was finding profiles. Carl: keep the pill where it is and take the text off the page, so
> the pill is the one thing saying what is happening; Pete's concern was "two things that aren't in
> sync". Only the section being researched animates; the pill gets a moving segment, a glow, a
> step count and a "Tap to follow along" hint. Sweetman approved the design the same day. Tracked
> on [#1494](https://github.com/xdjs/MusicNerdWeb/issues/1494).

> **Correction 2026-10-18 ([#1532](https://github.com/xdjs/MusicNerdWeb/issues/1532)):**
> light-mode research activity uses `highlightpink` (`#ff75d8`) for the active segment track
> and sweep, progress-pill glow, and status dot. Dark mode remains `pastyblue`.

## When it shows

`page.tsx` fetches the onboarding state from MusicNerdAPI (`fetchOnboardingState`) for the
approved claimant only. An unreadable state (a 503, a network error, or no answer within 5 s)
means **no takeover**, never "not started": the page renders as usual (fail closed).

The page doesn't drive the build. Approving a claim (MusicNerdAPI's
`POST /api/admin/claims/{id}/approve`, from the admin claims table) starts it there, which runs it as a durable workflow under the approved claim: profiles, sources,
then the Lore and About, each a retried step. It finishes whether or not anyone is on the page
([#1538](https://github.com/xdjs/MusicNerdWeb/issues/1538)).

While onboarding is incomplete, `OnboardingGate` renders the profile it is given inside the build
view (`ResearchInPlace`), which watches the state endpoint. When it opens, once Privy is signed in,
it also starts the build with the claimant's token (`useStartClaimBuild`), in case nothing has: a
claim approved before the build moved to the server, a failed start at approval, or a preview
without the research key. That is safe to repeat: a running build is left alone and a stopped one
resumes at its first unconfirmed step. There is no popup, step card or
chat: the old "Set up {artist}" step-card modal and its chat client are deleted
([#1533](https://github.com/xdjs/MusicNerdWeb/issues/1533)).

## Sections

Each section research fills shows that it is being researched, then makes its arrival visible
(design approved 2026-10-05, on #1365 under Design › Section research states).

| Section | Waits on step | While waiting | While researching | When it arrives |
|---|---|---|---|---|
| About (`#mn-about`, in the hero) | `publish` | three still, dim skeleton text lines in place of the blurb | the lines pulse | the About, ringed, with a "New About" chip |
| Links (`#mn-links`) | `profiles` | still, dim skeleton profile tiles, above any existing links | the tiles pulse | the links; each new one ringed with a dot; "N new" by the heading |
| Lore (`#mn-lore`, its sources) | `vault` | still, dim skeleton source cards in place of any existing sources | the cards pulse | the sources; each new one ringed with a "new" chip; "N new" by the heading |

A section is **researching** when it is the build's current step (`interview` counts as the About),
otherwise **waiting**. The sections carry no captions: the pill alone says what the build is doing,
so the page and the pill never disagree. Screen readers hear the researching section's status
(`role="status"`, named for its step); a waiting skeleton is hidden from them.

Latest (`#mn-latest`) does not depend on research and is unchanged. A section is pending only while
a build is being watched and its step has no confirmation time; otherwise it renders as usual.

- **What counts as new.** When the build view mounts it keeps a baseline: the profile links
  (`siteName`) and approved sources (`id`) the page had. Anything the refreshed page shows that is
  not in the baseline is new. A reload mid-build takes a new baseline, so items found before the
  reload are not marked.
- **Arrival.** When a section's step is confirmed while the page is watching, the section is
  *fresh*: its content fades in (about 400 ms), new items carry their mark, the section gets a pink
  border, and its tab in the section nav gets a dot. A section stays fresh until 5 s after it has
  been on screen, so a phone user who scrolls down later still sees the marks. The section announces
  itself once to screen readers.
- **Reduced motion.** No pulse, sweep, bounce or fade; the marks still show.

## Progress

- **Polling.** While `complete` is false, the page polls the state endpoint about every 2 s
  (`useOnboardingProgress`, `cache: "no-store"`). It stops once `complete` is true.
- **Repaint.** When a step is newly confirmed (`newlyConfirmedSteps`), the page calls
  `router.refresh()`, so its section repaints from the database. The database is the source of
  truth: a reload mid-build shows whatever has been written.
- **Unreadable poll.** A 503 or a network error is skipped and the next poll tries again. It is
  never treated as "not started".
- **Progress pill.** Fixed at the bottom right, where the Ask button sits; Ask is hidden while it
  shows. Ask is hidden from the first paint when the claimant's page arrives mid-build, so it
  doesn't flash before the pill mounts; on that visit it stays hidden until research completes. It carries the current step (`buildStepLabel`, announced politely), its place ("1 of 3"), and three
  segments (Links, Lore, About: done, running or waiting; `interview` counts as About). The running
  segment sweeps and the pill has a soft glow (`highlightpink` in light, `pastyblue` in dark), so it
  reads as live. Until the artist first taps it, a "Tap to follow along" hint with a bouncing arrow
  sits above it (Pete, 2026-10-12: "the person wouldn't have known to click that"). Tapping the hint
  does what tapping the pill does (Sweetman, 2026-10-12 preview test); it is out of the tab order and
  hidden from screen readers, the pill being the one control. The hint is not remembered across visits. It sits outside the
  page flow, so it shifts nothing when it appears or goes away.
- **Nothing scrolls by itself.** Clicking the pill scrolls once to the section being researched:
  `profiles` → Links (`#mn-links`), `vault` → Lore (`#mn-lore`), `interview`/`publish` → About,
  which goes to the top of the page so the header shows with it (Sweetman, 2026-10-09 manual test).
  It smooth-scrolls, or jumps with reduced motion. Otherwise the page stays where
  the artist puts it.
- **No editing during the build.** While research runs, the hero's **Edit** toggle and Lore's
  **Add to Lore** are hidden (`researching`, the same flag that holds back Ask).
- **Done.** On `complete` the page refreshes once more and arms the profile tour. The gate stays
  mounted for the rest of the visit (`page.tsx` renders it for the claimant whatever the state; a
  page loaded already complete renders just the profile), so the marks stay. The pill goes away,
  the Ask button comes back, and the tour's opening card (About) is the next thing the artist sees.
  Opening or restoring the tour scrolls to the section the card describes (About first), and
  **Next** and **Back** scroll to theirs, so the card is always beside its section. The card stays
  within the viewport. Its About copy is: "This draft
  is based on the sources on your profile. Edit it or write your own."
- **Failure.** In the same place, the pill shows "This is taking longer than usual." with "try
  again" when no step is newly confirmed for 90 s while incomplete. Trying again restarts the build
  as the signed-in claimant (`useRestartClaimBuild` → `POST /api/onboarding/{artistId}/build` with
  the Privy token), which resumes at the first unconfirmed step and leaves a running build alone.
  It resets the clock; if the API refuses, the pill says "Couldn't restart the build. Try again in
  a moment." What already painted stays.
- **Skip.** There is none: the build runs on the server and the page is usable throughout.

## Sign-in

Watching the build needs no sign-in: the state endpoint is public. Starting it on open and "try
again" send the claimant's Privy access token; without one, the start on open sends nothing and
"try again" reports the restart failure.

## Reviewing the loading colors

For color review ([#1532](https://github.com/xdjs/MusicNerdWeb/issues/1532)),
`/dev/research-preview` renders the actual progress pill and skeleton components with fixed
sample state in development and Vercel previews. It starts no research jobs and changes no
artist data. The route returns 404 in production. This fixture checks appearance; it does
not establish live claim-build or production acceptance.

## After research: optional support links

The completed page's `ProfileTour` runs after the build, once onboarding is complete. On its Links
step, artists with no saved support links see: “We didn't find any support links.
Give fans a way to support your music with Subvert, Bandcamp, or Supercollector.”
Each platform is an outbound hyperlink that opens in a new tab. A short reminder
points artists who already have a page to the existing **Support the artist** add-link
control. Next, Back and Skip remain available; no external signup is required.
The card stays within the viewport and scrolls internally on short screens, so
all copy and controls remain reachable in landscape. Its pointer remains outside
the scroll area. If saved support links change during the tour, the card repositions
for its new content before paint.

The artist page checks `getProfileLinks(..., 'support')` and the approved
source-backed destinations returned by `getSourceLinks(..., [], 'support')` after
excluding `blockedMusicSourceIds`. This is the same rule as the visible Support
section (including In Process and monetized services). Pending or identity-conflicting
sources do not suppress the suggestion. Existing support destinations suppress it. It only appears
inside the tour already gated on the approved claimant and completed onboarding,
so unfinished/failed research, missing onboarding state and visitors do not get a
new prompt. There are no new queries, API calls, research jobs or writes.

This is Pete's simplified scope for [#1305](https://github.com/xdjs/MusicNerdWeb/issues/1305),
agreed 2026-10-05. The implementation in #1429 is stacked on #1273 / #1430 so both
real and preview tour callers count exactly the approved destinations shown publicly.
Merge #1430 first, retarget #1429 to main after the squash merge, then recheck it
before merging. Production promotion remains separate.

For review, development and Vercel preview deployments accept `?tourPreview=1` on
an artist page. **Start tour preview** runs the actual tour using that profile's
saved links, with a separate browser completion flag. It does not run research or
offer an interview. The parameter has no effect in production.

## Rules

- **Tokens only.** `bg-background`, `text-foreground`, `border` and the stock radii; dark mode
  follows the tokens. The activity colour is `highlightpink` in light and `pastyblue` in dark (the dot,
  the running segment, the pill's glow); the follow hint uses the action pink, `highlightpink`, with
  black text. Muted text reads the token directly (`text-[hsl(var(--muted-foreground))]`), because
  `globals.css` forces `.dark .text-muted-foreground` to white with `!important` (DESIGN.md,
  inconsistency #5).
- **Artist-facing copy.** No internal reasons, step ids, issue numbers or error codes.
- **No new work on page load** beyond the one state read for the claimant. Nothing is written.
- **Accessible.** Loading lines are `role="status"`; the strip's step is `aria-live="polite"`; a
  failure is `role="alert"`; real buttons with 44 px targets.

### Server refreshes during a suspended edit

An open About edit retains its text and original Discard baseline when research refreshes the
saved bio, including a refresh arriving with resume. Leaving edit mode deliberately rebases the
next session to the latest saved bio. Explicit Save or selecting a pinned version establishes a new baseline; regeneration retains
the original Discard baseline. The separate Lore → Bios history communicates the authoritative
pinned version to the hero editor when its history refreshes; an unpinned refresh leaves drafts intact.
Lore source membership/classification refreshes update the review lists in place, retaining the
URL input, source search/filter, upload state and other unrelated editor state.
Removed source IDs are cleared from bulk selection; existing selections stay selected. Artist identity
still keys the editor; changing artists never carries drafts across profiles.

The hero stays mounted per artist. Incoming saved photo/crop props are applied outside active
or suspended edit sessions, so a discovered portrait cannot remount an unfinished About.
Explicit photo saves still update the current image immediately. Unchanged saved props never
revert a successful local photo/crop save when leaving edit; a changed server photo tuple
applies normally outside editing.
