# Research view

Tracked on [#1347](https://github.com/xdjs/MusicNerdWeb/issues/1347). This is the contract for
what a newly claimed artist sees while research builds their page: a live view of each research
step that takes the artist page's place, replacing the build popup (`BuildStatus`). The approved design is linked from
the issue's Design section.

> **Decision 2026-09-24 (Sweetman).** Show research live on a full page; don't store runs. The
> view reads the build's own stream and writes nothing new. It supersedes the stored-run design
> in [research-runs.md](research-runs.md).

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
| Releases ("your music on deezer") | `getLatestArtistReleases(artist)`, the same cached call the Latest section makes (24 h cache), started by the page for the claimant only and read by the view without blocking the page | Up to three covers. Missing or failed: the strip is left out |
| Stages | `progress` events grouped by `BUILD_STAGES` (`platform-search`, `source-search`, `about-write`), through `stageStates` | A quiet timeline: pending, running (the accent dot), done (a check), failed. The finished label carries the count ("found 7 profiles") |
| Lore document and About drafts | `writing` items from `text-delta` events ([llm.md](llm.md), "Streaming into the build popup"), through `writingDrafts` | Rendered as Markdown by Streamdown while they stream. `[n]` markers render as quiet superscripts (`citationSuperscripts`); a marker still arriving at the end is held back until it completes, so it never flashes as a half-typed link. The model's internal labels (`[VERIFIED CATALOG]`, "(date unknown)") are hidden (`stripModelLabels`), as `validateCitations` does for the saved text. The page shows the validated version once saved |
| Failure | The last `error` item | The step that was running is marked failed. Its partial draft stays on screen with "try again", which re-opens the turn (`{ type: "open" }`) |
| Done | The `complete` item | Every stage shows done, including one whose own "done" never arrived (a "try again" after a dropped connection gets only `complete`, because the server finished the build meanwhile). "see my page" closes the view as the popup did |

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

## Not in this slice

The profile cards (slice 2) and source cards (slice 3) in the approved design are later rows on
#1347. Until they land, those two stages show their label and count only.
