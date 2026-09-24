# Research view

Tracked on [#1347](https://github.com/xdjs/MusicNerdWeb/issues/1347). This is the contract for
what a newly claimed artist sees while research builds their page: a full-screen, live view of
each research step, replacing the build popup (`BuildStatus`). The approved design is linked from
the issue's Design section.

> **Decision 2026-09-24 (Sweetman).** Show research live on a full page; don't store runs. The
> view reads the build's own stream and writes nothing new. It supersedes the stored-run design
> in [research-runs.md](research-runs.md).

## When it shows

`OnboardingGate` renders it for the approved claimant while onboarding is incomplete, exactly as
it rendered the popup. It takes over the whole screen while the auto-build runs (`runAutoBuild`
in `src/server/utils/onboarding/turnHandlers.ts`). The resume path, where an artist answers step
cards, keeps the chat layout: a `step` or `draft` event switches to it, as before. A build that
**fails stays in the view** (below), where the popup used to switch to the chat layout and drop
what had streamed.

## What it shows

| Part | Source | Notes |
|---|---|---|
| Nav | — | The `music nerd` wordmark and "skip for now". Skipping keeps its session-scoped behaviour (`OnboardingGate`) |
| Hero | The page's `imageUrl` (custom image, else the platform image, else the default) and the artist's name | Lowercase copy: "setting up your page", then "your page is ready" |
| Releases ("your music on deezer") | `getLatestArtistReleases(artist)`, the same cached call the Latest section makes (24 h cache), started by the page for the claimant only and read by the view without blocking the page | Up to three covers. Missing or failed: the strip is left out |
| Stages | `progress` events grouped by `BUILD_STAGES` (`platform-search`, `source-search`, `about-write`), through `stageStates` | A quiet timeline: pending, running (the accent dot), done (a check), failed. The finished label carries the count ("found 7 profiles") |
| Lore document and About drafts | `writing` items from `text-delta` events ([llm.md](llm.md), "Streaming into the build popup"), through `writingDrafts` | Rendered as Markdown by Streamdown while they stream. `[n]` markers render as quiet superscripts (`citationSuperscripts`). The page shows the validated version once saved |
| Failure | The last `error` item | The step that was running is marked failed. Its partial draft stays on screen with "try again", which re-opens the turn (`{ type: "open" }`) |
| Done | The `complete` item | "see my page" closes the view as the popup did |

## Rules

- **Tokens only.** `bg-background`, `text-foreground`, `text-muted-foreground`, `border` and the
  stock radii. Dark mode follows the tokens. No hex values are added; the one colour is the brand
  wordmark pink already used across the site, and the active-step accent.
- **Artist-facing copy.** No internal reasons, tiers, issue numbers or error codes.
- **No new work on page load.** The releases call is the Latest section's cached call, started
  only when the view will render. Nothing is written.
- **Accessible.** Real buttons, an ordered list for the stages, the running stage announced with
  `aria-current="step"`, and `role="alert"` on a failure.

## Not in this slice

The profile cards (slice 2) and source cards (slice 3) in the approved design are later rows on
#1347. Until they land, those two stages show their label and count only.
