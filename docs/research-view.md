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

| Section | Waits on step | While researching |
|---|---|---|
| About (`#mn-about`, in the hero) | `publish` | "writing your about…" in place of the blurb |
| Links (`#mn-links`) | `profiles` | "finding your profiles…" above whatever is already linked |
| Lore (`#mn-lore`, its sources) | `vault` | "reading what's written about you…" above whatever is already there |

Latest (`#mn-latest`) does not depend on research and is unchanged. A section is pending only while
a build is being watched and its step has no confirmation time; otherwise it renders as usual.

## Progress

- **Polling.** While `complete` is false, the page polls the state endpoint about every 2 s
  (`useOnboardingProgress`, `cache: "no-store"`). It stops once `complete` is true.
- **Repaint.** When a step is newly confirmed (`newlyConfirmedSteps`), the page calls
  `router.refresh()`, so its section repaints from the database. The database is the source of
  truth: a reload mid-build shows whatever has been written.
- **Unreadable poll.** A 503 or a network error is skipped and the next poll tries again. It is
  never treated as "not started".
- **Done.** On `complete` the page refreshes once more and arms the profile tour. The server then
  sees onboarding complete and renders the page without the gate. It does not scroll the artist.
- **Status strip.** One line at the top of the page names the current step (`buildStepLabel`:
  `profiles` "finding your profiles", `vault` "reading what's written about you", `interview` and
  `publish` "writing your about") with "skip for now". Slice 2 replaces it with the designed
  above-the-fold indicator.
- **Failure.** The strip shows a failure, with "try again" (`{ type: "open" }`), when the turn's
  stream ends in an `error` event (its message), or when no step is newly confirmed for 90 s while
  incomplete ("This is taking longer than usual."). "try again" resets that clock. What already
  painted stays.
- **Skip** keeps its session-scoped behaviour (`OnboardingGate`): the banner, no loading lines.
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
