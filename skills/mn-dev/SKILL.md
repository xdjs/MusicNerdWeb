---
name: mn-dev
description: How Music Nerd plans, builds and ships work through GitHub. Two halves — write and maintain a tracking issue (PR matrix, Open→Done closure notes, dated decision callouts), then deliver it (docs first, TDD red→green, one function per file, Vercel preview verification with a documented-vs-observed matrix and screenshots on the PR, main → staging validation → approved production build). Use when asked to "write / update the issue", "add a row to the PR matrix", "log what shipped", "implement / ship / build out issue #N", "open PRs for the remaining rows", or "preview-test this PR".
---

# Music Nerd dev loop: track it, then ship it

The bar for both halves: **the issue, the docs, the code and the live preview all tell the same story, and every claim on the issue or PR is something you actually ran.** A teammate or an agent starting cold can read the issue and know what is done, what is left, why, and how to verify it, without re-deriving it from git.

The reference is [xdjs/MusicNerdWeb#1228](https://github.com/xdjs/MusicNerdWeb/issues/1228) (the Timeline section, September 2026): seven PRs, a design record, a mid-stream reversal, a release, closed with every row accounted for. Read it and its PRs (#1249, #1250, #1252, #1253) before your first tracker or PR here.

## Music Nerd specifics, in one place

- **Repos.** Issues live in `xdjs/MusicNerdWeb`, the repo every agent reads `CLAUDE.md` from, even when code lands elsewhere (MNTv, the Discord bot, the iOS app); link sibling PRs by full ref. The repo is **public**: no secrets, tokens, email addresses or Supabase refs in issues, PRs or docs. Env-var names only.
- **Branches.** Feature/fix branch off `main` → reviewed PR to `main` → squash merge. Code branches use `<contributor>/<slug>`: the actual contributor’s established prefix (for example, `pete/<slug>` for Pete or `sweetmantech/<slug>` for Sweetman). Never name one contributor’s branches after another. Codex branches use `codex/<slug>`. Docs-only branches may use `docs/<slug>`. Conventional commits.
- **Merging.** Never merge without authorization or bypass required review. PRs squash into `main` after approval and required `test`/`build` checks. The exact merged SHA deploys to staging; any one of Carl (`clt`), Pete (`p3t3rango`) or Sweetman (`sweetmantech`) approves the protected GitHub production environment before a separate production-config build and promotion. One approval is sufficient, the initiator may approve, and admin bypass is disabled. Record “merged to main”, “validated on staging” and “promoted to production” separately. Follow [the release runbook](../../docs/releases.md), including manual migration verification.
- **People.** Pete (product and design, merges), Carl (releases), Sweetman (engineering; call them Sweetman in writing). All three can approve production releases. Attribute decisions to whoever made them and where (standup, R&D sync).
- **Databases.** Vercel previews and `staging.musicnerd.xyz` use the **staging** database; production uses its own. The same artist has **different ids** on each. Say which. Dutchyyy on staging has an In Process link and is the usual fixture artist.
- **Local and preview verification.** When a configured local environment is available, run and review changes locally; respect a requested local review before pushing. Verify the target environment before exercising integrations, preserve existing env files, and keep credentials private. When local configuration is unavailable, use the documented stub-env build to prove compilation. Local checks complement the exact-commit Vercel preview verification below; they do not replace it.
- **Code shape.** `src/lib` is pure logic grouped by domain (`artist/`, `bio/`, `source/`, `inprocess/`); `src/server/utils` is server I/O under the same grouping. **New modules export one function each, named after the file, with a test beside the folder's other tests.** Older multi-export modules are split when next changed, not in a move. Reviewers ask for this; write it that way from the start.
- **Browser verification.** 832 px desktop and 390 px phone (2×, touch), both themes (`localStorage` key `musicnerd-theme` = `light` | `dark`). Screenshots are committed to the existing shared orphan branch `sweetmantech/pr-screenshots` (shared archive, worktree `mnw-shots`; not a contributor-branch naming template) and linked from PR comments by `raw.githubusercontent.com/xdjs/MusicNerdWeb/<sha>/<file>.png`; never on the feature branch.
- **Logged-in checks.** Previews use Privy email login. Enter the reviewer's email, ask them in chat for the six-digit code (codes expire fast; use the newest), fill the six `code-N` inputs; the page reloads logged in. A first login shows a "Welcome to Music Nerd!" dialog: *Skip for now*. **Never press Submit in the add-link modal on staging**: it files a real review-queue suggestion.
- **Runtime evidence.** The Vercel MCP `get_runtime_logs` (project `music-nerd`, team `musicnerd`, environment `preview`, filter by status 500) tells you whether a preview 500 is yours or the environment's. A `(EMAXCONNSESSION) max clients reached` cause is the staging Postgres pool, not your PR: reload, note it, move on.

---

# Half 1 — the tracking issue

## Anatomy

Sections in this order. Drop what does not apply; never reorder what you keep.

1. **Lead paragraph, no heading.** What this tracks, who asked and where (linked), the current live status. Below it, blockquotes for the **scope note** and any **dated decision callouts**.
2. **## Goal.** The end state in concrete terms: what a user sees, on which page, from which data. Name files, routes, tables.
3. **## PRs (updated <ISO date>).** The matrix, directly under Goal.
4. **## Design** *(when there is one)*. Link the design record and embed its boards. Records live at `docs/rnd/design/<YYYY-MM-DD>-<slug>/` with a README and PNGs. Link to the implementation branch until merge, then to `main`; record the production release run separately.
5. **## Done.** Closure notes, one per shipped item.
6. **## Open — <bucket>.** Mini-specs. Buckets by sequence or gate: `Open — in merge order, pick from the top`, `Open — Phase 2 (LAST, only after …)`, `Open — after v1, not scheduled`.
7. **## Architecture decisions.** Bold the decision, then the why, so it is not re-litigated.
8. **## Source references.** Originating discussion, key files by path, external APIs, prior art.

## The PR matrix

The examples below preserve the historical two-branch delivery record. For new work use
“merged to main”, “validated on staging at SHA/deployment” and “production via run/deployment”
as separate states. A merge to main is not evidence of production promotion.

```
## PRs (updated 2026-09-14 — all merged; #1252 on `main` via #1251; #1253 on `staging`)

| PR | Item | State |
|----|------|-------|
| [MusicNerdWeb#1249](url) | In Process client: fetch timeline, normalize to `Moment[]`, cache | ✅ merged 2026-09-14 to `staging`, on `main` 2026-09-14 via #1251 — see Done |
| [MusicNerdWeb#1251](url) | Release: staging → main | ✅ merged 2026-09-14 to `main` — see Done |
| [MusicNerdWeb#1253](url) | Chore: group `src/lib` into domain folders (no behaviour change) | ✅ merged 2026-09-14 to `staging` — see Done; reaches `main` with the next release |
| MusicNerdWeb#TBD | Per-source cap on Latest cards | ⏳ not started |
```

- **PR**: linked, full ref; planned PRs are `MusicNerdWeb#TBD` rows so the fleet is visible before code exists; every tracker with code has a **production release run row** after the implementation PR.
- **Item**: one line, worded to match the Done or Open item it backs.
- **State**: `⏳ not started` · `🔄 open — <verification status>` · `✅ merged <ISO> to main` · `validated on staging <SHA/deployment>` · `production <run/deployment>`.
- Below the table, an **order** blockquote when sequence matters; rewrite it as *what happened* once it has (the reference records that #1253 merged one minute after the release and so missed `main`).

**Update a row in the same session its PR changes state.** Replace `#TBD` the moment the PR opens. A stale row misleads everyone who trusts the matrix.

## Open → Done

An item is **not** closed by flipping the checkbox. When it ships, rewrite it as a closure note under `## Done`:

```
- [x] **[MusicNerdWeb#1252](url) — merge Timeline into Latest.**
  ✅ Shipped 2026-09-14 to `staging` (merge commit [b2f71cd](url), merged by Pete 19:22Z). Reaches `main` with release #1251.
  <what changed, technically: 3–6 sentences naming files and behaviour>
  Verified on the preview for the final commit (5e99b9b, both themes, 832 and 390 px): Dutchyyy 24 cards = 12 moments + 3 releases + 9 Instagram; no `#mn-timeline`; soft navigation between artists resets the dialog and filter. Matrices and 11 captures on the PR. CI green.
```

PR link · ✅ ISO date · merge commit · who merged · where it sits relative to `main` · what changed · **Verified** (what you exercised, on which SHA, what you observed, with numbers). If a hypothesis was wrong, say so and link the evidence.

## Open items are mini-specs

```
- [ ] **<one-line summary>.** (<PR if one exists>)
  - **Why:** <root cause or motivation, file:line where known>
  - **Fix:** <concrete steps>
  - **Done when:** <observable, checkable in scope>
```

Gates and blockers inline ("only after #1251 is on `main`"). Real findings that are not this tracker's job (an environment limit, a data quirk) still get this format under an unscheduled bucket; anything with real cost gets its own issue.

## Decisions change: supersede, don't erase

When the plan reverses (the reference went from a standalone section to cards inside Latest, one day after the section shipped to staging):

- Add a **dated, attributed blockquote** under the lead: what changed, who decided, where, the one-line reason.
- **Delete the superseded Open items**; the callout is the tombstone.
- Same session, update the **title**, Goal, matrix, design-record README (dated note), Architecture decisions ("supersedes …").
- Re-anchor in-flight PRs: what must change in each before it can merge.

## Evidence and upkeep

- Link every claim (PR, short SHA, file path, line range). Hard numbers. ISO dates.
- Time-stamped test results go in **PR comments**; the issue body is the canonical current state (`gh issue edit <n> --body-file <file>` keeps markdown intact).
- The **title is maintained state**; when scope changes, edit it.
- Close only when every item is Done, moved to a linked follow-up, or explicitly deferred or declined by the user. For approved deferrals, preserve the original issue link, reason, and dated decision attribution in the archive; an open replacement is not required. Record archival closure as deferred or not planned, never as fixed. Find or create an owning issue before resuming archived work.
- Smaller issues (a bug, one task): summary, repro, expected vs actual, suspected file:line, done-when. No tracker scaffolding.
- Scope to the **change**, not the business outcome: state the context once in the lead, keep every done-when checkable by the implementer.

---

# Half 2 — shipping a tracked issue

Only start from a real spec: Goal, done-when criteria, sequencing, source references. If the issue is vague, upgrade it with Half 1 first. Implementing against a vibe ships the wrong thing.

```
1. Read the issue + the ground     (done-when = test plan; CLAUDE.md; the nearest sibling to mirror)
2. Docs first                      (the contract: docs/<feature>.md, design record, dated notes)
3. Code by TDD                     (red → green → refactor; one function per file)
4. npm run ci                      (types, lint, tests; build with the stub env)
5. Open the PR to main             (link the issue; update the matrix row now)
6. Wait for the preview            (poll the deployment for YOUR SHA)
7. Verify on the preview           (every done-when, both viewports, both themes, real data)
8. Comment: matrix + captures      (documented vs observed, hard numbers, per SHA)
9. Triage reviews                  (Codex bot and humans: validate, fix, reply with commit + re-verification)
10. Re-run 6→8 after EVERY behaviour-changing push
11. Hand off                       (record main merge, staging validation and approved production run)
```

## 1. Read the ground

- From the issue: the contract, every done-when (your test plan), the merge order, source references (re-check any external API doc; if it is client-rendered, read it in a browser, not with a fetch).
- `CLAUDE.md`, `docs/development.md`, and the feature's contract doc if one exists (`docs/artist-latest.md` for anything touching Latest).
- **Find the nearest sibling and mirror it.** The Latest section (`LatestSection` → `getArtistLatest` → `LatestCards`) is the model for a data-backed profile section; `src/lib/inprocess/` is the model for a lib domain. Consistency with the neighbour beats cleverness.
- Work in a worktree off `main` (`git worktree add ../mnw-<x> -b <contributor>/<slug> origin/main`, symlink `node_modules` from the main checkout). Say up front when a PR is plumbing that renders nothing on its own, so a stacked PR does not surprise the reviewer.

## 2. Docs first

The contract merges with, or before, the code that fulfils it. In this repo that usually means the **first commit of the same PR**: the contract doc under `docs/` (a table row, a data-path paragraph, the latency or failure boundary you are introducing), and a dated note in the design record when a decision changed. A design that needs its own review gets its own docs PR first (#1229 preceded the section). Document only what the code will actually do.

## 3. Code by TDD

Red → green → refactor, one unit at a time:

1. Write the failing test first, beside its module (`src/lib/<domain>/__tests__/<fn>.test.ts`, `src/app/…/_components/__tests__/<Component>.test.tsx`).
2. Run it and **see it fail** (`npx jest <path>`): module not found for a new file, an assertion for new behaviour.
3. Minimum code to pass.
4. Refactor to the shape reviewers expect: **one exported function per file, named after it**; a types-and-constants module is the one exception. Server components stay server components; `"use client"` only where hooks or events need it. Key a reused client component by the entity it belongs to (`key={artist.id}`) so client navigation between profiles resets its state.

Then the full run, exactly as documented in `docs/development.md`:

```bash
npm run type-check && npm run lint && npm run test:ci
NEXT_PUBLIC_SPOTIFY_WEB_CLIENT_ID=stub NEXT_PUBLIC_SPOTIFY_WEB_CLIENT_SECRET=stub OPENAI_API_KEY=stub npm run build
```

The stub build proves compilation, not integrations. Never write those values to `.env.local`.

## 4–5. Open the PR, update the matrix

PR body: what changes and why, in the user's terms; trade-offs you are introducing (a read moved inside a Suspense boundary, a cache TTL); what was verified locally; "preview verification follows in a comment". Base `main`. Link the issue. **Replace the `#TBD` row on the issue in the same session.**

## 6. Find the preview for your SHA

```bash
SHA=$(git rev-parse HEAD)
D=$(gh api "repos/xdjs/MusicNerdWeb/deployments?sha=$SHA" --jq '.[0].id')
gh api repos/xdjs/MusicNerdWeb/deployments/$D/statuses --jq '.[0] | "\(.state) \(.environment_url)"'
```

Poll until `success`. Confirm it is **your** commit's deployment, not a stale one. Do this again for **every** push that changes behaviour, including review fixes.

## 7. Verify on the preview

Turn each done-when into a check against the real preview with real data:

- **Structure first, over HTTP.** `curl` the page: status, the section ids in order, counts in the streamed RSC payload (`"kind":"moment"` occurrences and the like). Cheap, and it catches a missing section before you open a browser.
- **Then the browser** (the Chrome DevTools MCP works without an extension): 832 px and 390 px (`390x844x2,mobile,touch`), dark and light. Drive the actual interaction: click the filter, open the dialog, soft-navigate to another artist with `next.router.push` and confirm state resets. Read the DOM for measurements (a chip's height tells you whether its text wrapped) rather than eyeballing.
- **The negative case.** An artist without the data (no In Process link, no releases) must be unchanged.
- **Logged-in surfaces** when the change touches them (add-link modal, edit mode): Privy OTP per the specifics above; never submit on staging.
- **Console and network.** Expired Instagram CDN images 403 on every profile; that is documented, not yours. Anything from app code is.
- **A 500 on the preview**: check the runtime logs before assuming it is your change. Environmental causes get recorded on the issue as an unscheduled item, with the cause and a fix sketch.

## 8. Comment on the PR

One comment per verified SHA, headed with the SHA and deployment:

```
## Preview verification — `5e99b9b` (deployment 6441…, Ready)

Preview: <url>. Staging database. 832 px and 390 px, both themes.

| Check | Documented | Observed |
|---|---|---|
| Dutchyyy `6cb3d81a-…` | moments in Latest, no Timeline section | HTTP 200 in 8.6 s cold; 24 cards = 12 moments + 3 releases + 9 Instagram; `#mn-timeline` absent |
| Chip at 390 px | "IN PROCESS" never breaks | all 12 chips 25 px tall; the two Writing cards' chip group 174×56 (media-type chip on its own row) |
```

Then the captures, hosted on `sweetmantech/pr-screenshots` and linked by SHA. Screenshots are **required** for UI PRs; prose alone does not pass review here. Say what you did **not** exercise and why.

## 9. Reviews

The Codex bot (`chatgpt-codex-connector`) reviews every PR with P1/P2 findings. **Validate before applying**: some are real (a reused client component keeping stale state across navigation), some overstate (a docs rule the moved code did not yet meet). Fix what is real at its root, reply on the thread with the commit and the re-verification, and re-run 6→8 for that SHA. Human review asks (a missing field the API actually carries, a wrapping chip) get the same treatment: test first, fix, preview, comment.

## 10–11. Hand off

After an authorized squash merge, record the main SHA and its validated staging deployment in
the issue row. Production requires the protected environment approval and manual migration
checklist in [releases](../../docs/releases.md). Record the separate production build ID,
immutable-URL checks and promotion evidence. Never call a main merge “shipped to production”
while approval is pending. Older two-branch records remain historical evidence.

## Checklist before you say "done"

- [ ] Issue was a real spec; matrix row updated the session the PR opened, and again when it merged.
- [ ] Docs carry the contract and any trade-off; design record has a dated note if the design moved.
- [ ] Every unit was **red before green**; new modules one-function-per-file with their test.
- [ ] `type-check`, `lint`, `test:ci`, stub-env `build` all green; reported with counts.
- [ ] Preview confirmed **built from your SHA**; every done-when exercised with real data, both viewports, both themes, the negative case.
- [ ] Verification comment per SHA with a documented-vs-observed table and **captures**; unexercised paths named.
- [ ] Every behaviour-changing push re-verified on its own preview.
- [ ] Reviews triaged on the thread with commit + re-verification.
- [ ] No merge or promotion without authorization and required review; nothing secret in public text.
