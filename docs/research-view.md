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
> ([docs](https://musicnerd-docs.vercel.app/api-reference/onboarding/state)), not the database.

> **Decision 2026-10-08 ([R&D sync](https://github.com/xdjs/MusicNerdWeb/issues/1464); Pete,
> Sweetman): no "Your page is ready" card.** Its **See what we found** only scrolled to a
> hard-coded section, and the tour already opens on completion. When research completes, the
> status card goes away and the tour takes over. Tracked on
> [#1464](https://github.com/xdjs/MusicNerdWeb/issues/1464).

> **Decision 2026-10-08 ([R&D sync](https://github.com/xdjs/MusicNerdWeb/issues/1464); Pete,
> Sweetman): research scrolls by itself, until the artist scrolls.** Pete asked for a way to
> follow the build without knowing to scroll; Sweetman proposed following by default and stopping
> once the artist scrolls; Pete: "that's perfect". This narrows the earlier "nothing scrolls by
> itself" rule to the tour.

## When it shows

`page.tsx` fetches the onboarding state from MusicNerdAPI (`fetchOnboardingState`) for the
approved claimant only. An unreadable state (a 503, a network error, or no answer within 5 s)
means **no takeover**, never "not started": the page renders as usual (fail closed).

While onboarding is incomplete, `OnboardingGate` renders the profile it is given and sends the
`open` turn of MusicNerdAPI's `POST /api/onboarding/{artistId}/chat` once, as the kick-off. The turn
is idempotent: a reload or a "try again" resumes the build rather than repeating it. The page does
not read the turn's stream for progress.

The resume path is unchanged: when the turn answers with a step card (`step` or `draft` event), the
step cards open over the page as before.

## Sections

Each section research fills shows that it is being researched, then makes its arrival visible
(design approved 2026-10-05, on #1365 under Design › Section research states).

| Section | Waits on step | While researching | When it arrives |
|---|---|---|---|
| About (`#mn-about`, in the hero) | `publish` | three skeleton text lines in place of the blurb, "writing your about…" | the About, ringed, with a "New About" chip |
| Links (`#mn-links`) | `profiles` | skeleton profile tiles, "finding your profiles…" | the links; each new one ringed with a dot; "N new" by the heading |
| Lore (`#mn-lore`, its sources) | `vault` | skeleton source cards, "reading what's written about you…" | the sources; each new one ringed with a "new" chip; "N new" by the heading |

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
- **Reduced motion.** No shimmer and no fade; the marks still show.

## Progress

- **Polling.** While `complete` is false, the page polls the state endpoint about every 2 s
  (`useOnboardingProgress`, `cache: "no-store"`). It stops once `complete` is true.
- **Repaint.** When a step is newly confirmed (`newlyConfirmedSteps`), the page calls
  `router.refresh()`, so its section repaints from the database. The database is the source of
  truth: a reload mid-build shows whatever has been written.
- **Unreadable poll.** A 503 or a network error is skipped and the next poll tries again. It is
  never treated as "not started".
- **Follow.** While the build runs, the page scrolls to the section being researched each time
  the current step changes: `profiles` → Links (`#mn-links`), `vault` → Lore (`#mn-lore`),
  `interview`/`publish` → About (`#mn-about`). It smooth-scrolls, or jumps with reduced motion.
  The artist's own scroll input (wheel, touch, or a scroll key) stops following for the rest of the
  visit. A scroll event alone doesn't count, because the page's own scrolling fires those too. A
  failure stops it; a reload mid-build follows again. When the build completes while still
  following, the page lands on About once more: the status card above the hero unmounts then, and
  without this About would slide under the sticky header just as the tour opens on it.
- **Status card.** Above the fold: the current step (`buildStepLabel`), three segments (Links, Lore,
  About: done, running or waiting; `interview` counts as About) and "skip for now".
- **Done.** On `complete` the page refreshes once more and arms the profile tour. The gate stays
  mounted for the rest of the visit (`page.tsx` renders it for the claimant whatever the state; a
  page loaded already complete renders just the profile), so the marks stay. The status card goes
  away, and the tour's opening card (About) is the next thing the artist sees. Following ends on
  About, where the tour opens. Apart from following during the build, nothing scrolls by itself: opening or restoring the tour preserves
  the artist's scroll position, and only the artist choosing **Next** or **Back** scrolls to a tour
  section. The opening card stays within the viewport even when About is above the reader's
  current position. Its About copy is: "This draft is based on the sources on your profile. Edit it
  or write your own."
- **Failure.** The card shows a failure, with "try again" (`{ type: "open" }`), when the turn's
  stream ends in an `error` event (its message), or when no step is newly confirmed for 90 s while
  incomplete ("This is taking longer than usual."). "try again" resets that clock. What already
  painted stays.
- **Skip** keeps its session-scoped behaviour (`OnboardingGate`): the banner, no skeletons.
  The build carries on server-side.

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
  follows the tokens. The one colour is the activity dot (`pastypink` in light, `pastyblue` in
  dark). Muted text reads the token directly (`text-[hsl(var(--muted-foreground))]`), because
  `globals.css` forces `.dark .text-muted-foreground` to white with `!important` (DESIGN.md,
  inconsistency #5).
- **Artist-facing copy.** No internal reasons, step ids, issue numbers or error codes.
- **No new work on page load** beyond the one state read for the claimant. Nothing is written.
- **Accessible.** Loading lines are `role="status"`; the strip's step is `aria-live="polite"`; a
  failure is `role="alert"`; real buttons with 44 px targets.
