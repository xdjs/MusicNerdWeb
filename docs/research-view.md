# Research view

Tracked on [#1347](https://github.com/xdjs/MusicNerdWeb/issues/1347). This is the contract for
what a newly claimed artist sees while research builds their page: a live view of each research
step that takes the artist page's place, replacing the build popup (`BuildStatus`). The approved design is linked from
the issue's Design section.

> **Decision 2026-09-24 (Sweetman).** Show research live on a full page; don't store runs. The
> view reads the build's own stream and writes nothing new. It supersedes the stored-run design
> in [research-runs.md](research-runs.md).

> **Superseded 2026-09-25 (standup; Carl, Pete, Sweetman): research paints the profile in place**
> ([#1365](https://github.com/xdjs/MusicNerdWeb/issues/1365)). The full-page view below is being
> replaced slice by slice. Its events and `src/lib/onboarding/` functions stay; the page section
> that follows is the current contract, and the rest of this file describes the view until slice 4
> removes it.

## In place (#1365 slice 1)

While the auto-build runs, the claimant sees **their own profile page**, not the research view.
`OnboardingChat` renders the page it is given (`children`), and puts the build's stage states in
`ResearchProgressContext`. Each section that research fills shows a loading line until its stage
reports done:

| Section | Waits on | While researching |
|---|---|---|
| About (`#mn-about`, hero) | `about-write` | "writing your about…" in place of the empty blurb |
| Links (`#mn-links`) | `platform-search` | "finding your profiles…" above whatever is already linked |
| Lore (`#mn-lore`) | `source-search` | "reading what's written about you…" above whatever is already there |

Latest (`#mn-latest`) does not depend on research and is unchanged.

- **Repaint:** when a stage reports done (`progress` with `done: true`), the page calls
  `router.refresh()`, so that section repaints from the database. The database is the source of
  truth: a reload mid-build shows whatever has been written.
- **Finish:** on `complete` the page refreshes and the build closes itself; there is no "see my
  page" step. It does not scroll the artist anywhere.
- **Status strip:** a one-line strip at the top of the page names the current step and offers
  "skip for now". A failed step shows its message there with "try again" (`{ type: "open" }`), and
  what already painted stays. Slice 2 replaces the strip with the designed above-the-fold indicator.
- **Skip** keeps its session-scoped behaviour (`OnboardingGate`): the banner, and no loading lines.
- The resume path (step cards) is unchanged.

## When it shows

`OnboardingGate` renders it for the approved claimant while onboarding is incomplete, exactly as
it rendered the popup. While the auto-build runs (`runAutoBuild` in
`src/server/utils/onboarding/turnHandlers.ts`) the view **takes the artist page's place, under the
app's own nav**. There is no overlay and no header of its own (Sweetman, 2026-09-24). The page
passes its content (`ArtistProfileContent`: hero through the Ask sheet) to the gate as `children`; the gate hands it to the
chat, which shows the view instead of it during the build, and gives it back when the build
finishes or is skipped. The view sits in the page container (`max-w-[800px]`), so it resizes like
every other page, with a fluid heading and photo. The resume path, where an artist answers step
cards, keeps the chat layout: a `step` or `draft` event switches to it, as before. A build that
**fails stays in the view** (below), where the popup used to switch to the chat layout and drop
what had streamed.

## What it shows

| Part | Source | Notes |
|---|---|---|
| Actions | — | "skip for now" while building, "see my page" when done, under the hero's text. Skipping keeps its session-scoped behaviour (`OnboardingGate`) |
| Hero | The page's `imageUrl` (custom image, else the platform image, else the default) and the artist's name | Lowercase copy: "setting up your page", then "your page is ready" |
| Releases ("your latest releases") | `getLatestArtistReleases(artist)`, the same cached call the Latest section makes (24 h cache), started by the page for the claimant only and read by the view without blocking the page | Up to three covers. The label names no service: the call falls back from Deezer to Spotify. Missing or failed: the strip is left out |
| Stages | `progress` events grouped by `BUILD_STAGES` (`platform-search`, `source-search`, `about-write`), through `stageStates` | A quiet timeline: pending, running (the accent dot), done (a check), failed. The finished label carries the count ("found 7 profiles") |
| Profiles ("finding your profiles") | `candidate` events while discovery runs, then one `linked` event with the profiles the build **wrote** to the artist's row, through `foundProfiles` | The finished stage counts its cards ("Found 7 profiles"), not what discovery proposed. A card per profile: its image (`previewImage`, else the platform logo, else its first letter), the platform icon and name, and the handle. Cards appear as `candidate` events arrive; once `linked` arrives, the cards are exactly what was written, so a profile the identity guards refused, or a second account for a platform, drops out. One `linked` event per write, merged by platform, the latest winning |
| Refused platforms | One `unreachable` event (the platforms' display names) after discovery, through `unreachableNote` | One plain sentence under the cards: "instagram wouldn't let us look just now, so that's not a 'no'. you can add it from your page." It replaces the chat line the build used to send, which the view never showed |
| Sources ("reading what's written about you") | A `source` event each time the source search saves one (`onSaved` on `searchAndPopulateVault`, at both of its save points), then one `sources` event with every approved source on the artist's page once the stage is done, through `savedSources` | Up to three sources with a share image (`og_image`) as cards, the domain above the title. Up to four more as compact rows: a letter, the title, the domain. Once `sources` arrives: "17 sources in all. 10 more are in your lore, where you can keep or remove each one." The total counts sources already on the page too, because claim approval runs the same search first. Events sent after the stage's 45 s budget are dropped (`yieldWhileRunning` stops listening when the race settles) |
| Links the source search adopts | The artist's row read before and after the search, compared by `adoptedProfiles` | Each link column the search filled or changed (MusicBrainz, the artist's own page, search results) is sent as a `linked` event, so it joins the cards under "finding your profiles" |
| Lore document and About drafts | `writing` items from `text-delta` events ([llm.md](llm.md), "Streaming into the build popup"), through `writingDrafts` | Rendered as Markdown by Streamdown while they stream. `[n]` markers render as quiet superscripts (`citationSuperscripts`); a marker still arriving at the end is held back until it completes, so it never flashes as a half-typed link. The model's internal labels (`[VERIFIED CATALOG]`, "(date unknown)") are hidden (`stripModelLabels`), as `validateCitations` does for the saved text. The page shows the validated version once saved |
| Failure | The last `error` item | The step that was running is marked failed. Its partial draft stays on screen with "try again", which re-opens the turn (`{ type: "open" }`) |
| Done | The `complete` item | Every stage shows done, including one whose own "done" never arrived (a "try again" after a dropped connection gets only `complete`, because the server finished the build meanwhile). "see my page" closes the view as the popup did |

A finished stage stays open while the build runs (the approved design shows found profiles under
a done stage while the Lore is still being written). Once the build completes, a stage with cards
collapses to an overlapping stack of their images and a one-line summary, via `listSummary`
("spotify, youtube, bandcamp, soundcloud and 3 more"; for sources, their domains). A chevron beside the stage's title opens
and closes it (`aria-expanded`).

## Rules

- **Tokens only.** `bg-background`, `text-foreground`, `text-muted-foreground`, `border` and the
  stock radii. Dark mode follows the tokens. No hex values are added; the one colour is the
  active-step accent (`pastypink` in light, `pastyblue` in dark). Muted text reads the token directly
  (`text-[hsl(var(--muted-foreground))]`), because `globals.css` forces `.dark .text-muted-foreground`
  to white with `!important` (DESIGN.md, inconsistency #5).
- **Artist-facing copy.** No internal reasons, tiers, issue numbers or error codes.
- **No new work on page load.** The releases call is the Latest section's cached call, started
  only when the view will render. Nothing is written.
- **Accessible.** A section named by the artist's name inside the page's own `<main>`, real
  buttons, an ordered list for the stages, the running stage marked `aria-current="step"`, and
  `role="alert"` on a failure.

