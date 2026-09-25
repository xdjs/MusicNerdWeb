# Research runs

> **Superseded 2026-09-24 (Sweetman, team call).** Runs are not stored. Research is shown live
> instead, in the [research view](research-view.md). This contract stays as the record of the
> design and its step vocabulary. Migration `0030` (#1349) was closed unmerged and never applied.
> Carl noted that a debugging log table remains an option if the live view isn't enough.

Tracked on [#1347](https://github.com/xdjs/MusicNerdWeb/issues/1347). This is the contract for
recording what artist research does and for the page that shows it. The schema is migration
`0030`. The recorder, the triggers and the page follow it; until they ship, runs are not written.

A **research run** is one execution of artist research. It records what the run looked for,
every link it found, what it kept or dropped and why, and where each kept item went. Today the
database keeps only the survivors (`artist_vault_sources`, handle columns on `artists`). Every
other decision exists only as a runtime log line.

## What starts a run

Five places start research. Each opens exactly one run and names itself in `trigger`.

| `trigger` | Where | Who | What it runs |
| --- | --- | --- | --- |
| `claim_approval` | `approveClaimAction` (`src/app/actions/adminClaimActions.ts`) | admin | source search, in the background, with no UI |
| `onboarding_build` | `runAutoBuild` (`src/server/utils/onboarding/turnHandlers.ts`) on a fresh claim | approved claimant | profile discovery, then source search, then About: **one run** across the three |
| `onboarding_step` | onboarding step cards on resume ("find more profiles", the sources step) | approved claimant | profile discovery and/or source search |
| `lore_search` | Edit Profile → Lore → **Search web for sources** (`searchWebForSources`, `src/app/actions/dashboardActions.ts`) | any editor | source search |
| `about_generation` | `generateArtistBio` (`src/server/utils/queries/artistBioQuery.ts`) when the vault is empty | the visitor loading the About, possibly anonymous | source search, then About |

`triggered_by` is the signed-in user who caused it, or null (anonymous About loads).

## The run row

Table `artist_research_runs`:

| Column | Meaning |
| --- | --- |
| `id` | uuid; also the `message.id` |
| `artist_id` | the artist researched; the run is deleted with the artist |
| `trigger` | one of the five above |
| `triggered_by` | `users.id`, or null; set to null if the user is deleted |
| `status` | `running` → `completed` or `failed` |
| `started_at`, `finished_at` | `finished_at` is null while running |
| `searches`, `results` | web searches made and results returned, across all steps |
| `sources_saved` | rows inserted into `artist_vault_sources` by this run |
| `links_saved` | handle or link columns written by this run |
| `rejected` | results the run looked at and did not keep |
| `message` | the steps, as one AI SDK `UIMessage` (below) |

`artist_vault_sources.run_id` names the run that inserted a source (null for sources added by
hand, uploaded, or found before runs existed). It is set to null if the run is deleted.

## Steps: one `UIMessage`, one tool part per step

`message` is an AI SDK `UIMessage` (`ai` 7): `{ id, role: "assistant", parts }`. Each step
the run takes is one **tool part**:

```json
{ "type": "tool-webSearch", "toolCallId": "<step id>", "state": "output-available",
  "input": { "query": "\"Pete Rango\" artist profile", "provider": "tavily" },
  "output": { "results": [{ "title": "…", "url": "…", "snippet": "…" }] } }
```

- **`state`** is `input-available` while the step runs, then `output-available` (with
  `output`) or `output-error` (with `errorText`). A run that finishes with a step still in
  `input-available` closes it as `output-error` with `errorText: "interrupted"`.
- **Text parts** carry prose the artist would read (the About draft, the build's closing
  narration). No reasoning parts: the pipeline's decisions are rules, not model thoughts, and
  a judge's reason is recorded on the step that used it.
- **The row is overwritten after each step**, as one JSON value. There is no per-step table.
  Counts that need querying are columns on the row.

### Step vocabulary

| Tool part | `input` | `output` |
| --- | --- | --- |
| `tool-profileDiscovery` | `{ tier, platform, candidate }` (tier 1–4; the handle or URL tried) | `{ outcome: "found" \| "rejected" \| "unreachable" \| "missed", handle?, reason? }` |
| `tool-webSearch` | `{ query, provider, domains? }` | `{ results: [{ title, url, snippet }] }` |
| `tool-musicbrainz` | `{ artistName, matchedBy? }` (`identifier` or `exact-name`) | `{ links: [{ url, outcome, detail? }], homepage? }`; `outcome` ∈ `adopted` (a handle; `detail` = `platform=handle`), `seeded` (the homepage, fed to the source search), `ignored` (with `detail`: the reason), `dropped` (`detail: "no matching platform"`) |
| `tool-judgeSource` | `{ url, title }` | `{ verdict: "kept" \| "rejected", reason? }`; `reason` ∈ `not about the artist`, `index page`, `unreadable`, `blocked host`, `duplicate`, `unverifiable`, `account page does not name the artist` |
| `tool-saveSource` | `{ url, title }` | `{ destination: "links" \| "lore", column?, type?, status, reason? }` (`column` for Links, e.g. `bandcamp`; `type` and `status` for Lore, e.g. `article`, `pending`; `reason` when a profile-like page went to Lore, e.g. `no matching platform`) |
| `tool-writeAbout` | `{ sources }` (citable sources available) | `{ written: boolean, citable }` |

A new kind of step adds a row here in the PR that records it.

### Worked examples (#1273, 2026-09-23)

Pete Rango's Beatport page (the first #1273 reproduction) is a `tool-webSearch` result, then
`tool-judgeSource` `kept`, then `tool-saveSource` with `destination: "lore"`, `type: "article"`,
`status: "pending"`, `reason: "no matching platform"`. Willie Colón's run, which dropped his
Apple Music and Beatport pages, reads as:

```json
{ "type": "tool-musicbrainz", "state": "output-available",
  "input": { "artistName": "Willie Colón", "matchedBy": "identifier" },
  "output": {
    "homepage": "https://www.williecolon.com/",
    "links": [
      { "url": "https://instagram.com/realwilliecolon", "outcome": "adopted", "detail": "instagram=realwilliecolon" },
      { "url": "https://music.apple.com/us/artist/31526769", "outcome": "dropped", "detail": "no matching platform" },
      { "url": "https://www.beatport.com/artist/willie-colon/117100", "outcome": "dropped", "detail": "no matching platform" },
      { "url": "https://www.williecolon.com/", "outcome": "seeded" } ] } }
{ "type": "tool-saveSource", "state": "output-available",
  "input": { "url": "https://www.williecolon.com/", "title": "Willie Colon Official Website | Salsa Legend" },
  "output": { "destination": "lore", "type": "article", "status": "approved" } }
```

## Rules

- **Recording never fails research.** A recorder error is logged and the run carries on; the
  artist's build is never slowed or broken by it.
- **Who can see a run:** the artist's editors (the approved claimant and admins). A run lists
  what research rejected (namesakes, contact-data pages), so it is not public. The database
  role grants are role-wide like every other app table; the page authorizes the viewer.
- **What reaches the browser:** only the fields in the step vocabulary above (URLs, titles,
  snippets cut to 300 characters, verdicts, destinations, counts). Never page text
  (`extracted_text`), provider responses as returned, or credentials: `CLAUDE.md` keeps raw
  research payloads out of client props and logs.
- **Live view:** the page polls the run every few seconds while `status = running`. Saving
  after each step is what makes polling enough; there is no stream to reconnect to.
- **Retention:** runs are kept for the artist's lifetime and deleted with the artist.
- **Not recorded here:** Instagram ingest and caption extraction (`artist_research_jobs`) and
  the ID-mapping workers (`agent_runs`) keep their own records.
