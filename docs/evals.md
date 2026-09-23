# LLM evals — contract

A benchmark every model or workflow change runs through before it ships, so "this model is
good" is a number against a pinned baseline rather than a read of one artist. Asked for by
Carl at the [2026-09-22 standup](rnd/transcripts/2026-09-22-standup-6c8487105fdd.md)
(00:04:59); delivery is tracked on
[#1329](https://github.com/xdjs/MusicNerdWeb/issues/1329). The sites being measured and their
budgets are in [llm.md](llm.md); the model *choice* stays on
[#1259](https://github.com/xdjs/MusicNerdWeb/issues/1259).

> **Decision 2026-09-22 (Sweetman, on the call and on #1329).** Evals run **on demand, never
> on every push**: they spend model tokens, and a suite that runs on every PR becomes expensive
> noise (Recoup added one in January 2026 and removed it two weeks later). They run at decision
> points: a model swap, a prompt change, a research-flow change. **[Braintrust](https://www.braintrust.dev/)**
> holds the datasets and experiments; nothing else was clearly better for this stack, and the
> team knows it from Recoup.

## What a suite is

One file `evals/<suite>.eval.ts`, one Braintrust `Eval("music-nerd", …)` call: a **dataset**
(inputs with expected values), a **task** (the code under test) and **scorers**. The task calls
the app's own functions, never HTTP: the same wrapper the routes use
(`src/server/lib/ai/generateText.ts`), or the same research functions the workers use. No preview
URL, no login, and the suite survives the research endpoint moving to another repo.

| Piece | Where | Rule |
| --- | --- | --- |
| Suite | `evals/<suite>.eval.ts` | One `Eval` per file; the file name is the suite name and the workflow's `suite` option. |
| Scorer | `src/lib/evals/scorers/score<Thing>.ts` | Pure: domain values in, `Score` out (`{ name, score: 0–1, metadata }`), with the evidence for the number in `metadata`. One exported function per file, named after it, with a test in `__tests__/`. The eval file adapts Braintrust's `{ input, output, expected }` into the scorer's arguments. |
| Dataset | `src/lib/evals/<suite>Cases.ts` | Hand-verified cases as data, with a note per case saying what it tests. |
| Task adapter | `src/server/utils/evals/<verb><Thing>.ts` | Server I/O: reads real data and calls the code under test. The only files that know where that code lives and how the page reads its results. One function per file, with a test that mocks the database and the pipeline. |
| Experiment name | `src/lib/evals/experimentName.ts` | `<suite> · <model> · <short sha>`. |

**Deterministic scorers first.** Research has ground truth (handles, namesakes, where a profile
URL was stored); Ask has structure (citation markers, a four-item schema, a time budget). Those
score for free and catch most regressions. An LLM judge is used only where no ground truth can
answer the question: prose quality, and whether a kept source is about the artist at all (the
hand-listed namesakes in `forbidHosts` only catch the ones somebody already found). Judges always
go through the gateway so their spend lands in the same budget as production. They run on the
wrapper's default model, except where the judge grades a site that already runs on it: the
source-relevance judge grades the pipeline's own Flash relevance filter, so it runs on
`MODEL_JUDGE` (Pro), because the same model would share the filter's blind spots.

Scorers in the repo:

| Scorer | Scores | Used by |
| --- | --- | --- |
| `scoreExactMatch` | output equals expected after trimming | smoke |
| `scoreWithinBudget` | the call finished inside the site's timeout ([llm.md](llm.md)) | ask, about (research has no documented budget; it records seconds instead) |
| `scoreHandles` | known handles found, wrong ones penalised, on the research benchmark's rules | research, twice: `discovery_handles` after profile discovery alone, `handles` after the source search as well, so a regression is attributable to the half that caused it |
| `scoreNoWrongHandles` | 0 when any stored handle is not the artist's (differs from a known one, or belongs to another artist); missing handles do not count. **A research change that drops any case below 1 does not merge**, whatever the averages say: a stranger's account on a profile is worse than any number of missed sources | research |
| `scoreForbiddenHosts` | no namesake or blocked host among kept sources | research |
| `scoreSourcesKept` | sources kept against the case's floor (`minSources`, from the 2026-08-31 benchmark run), so a provider that finds nothing cannot pass on precision alone | research |
| `scoreSourceRelevance` | share of kept sources a Pro judge (`judgeKeptSources`, one call per case) finds to be about this artist, given the case's known accounts and namesake note; the ones it rejects are named with a reason. Precision on sources nobody has listed as namesakes yet | research |
| `scoreSourceCoverage` | of the sources the judge accepts, the share that is **coverage** (interview, review, article, feature, podcast) rather than a **listing** (directory, catalogue, database, store or streaming page) or the artist's **own** site or account, labelled by the same judge call; the counts per kind are in the metadata and the run log. More sources is not better research if the extra ones are listings; nothing accepted scores 0 | research |
| `scoreLinkPlacement` | expected profile URLs stored as Links, nothing profile-typed in Lore (#1273) | research |
| `scoreCitations` | citation markers resolve to sources the answer was given, read as the route reads them | ask |

## The model under test

The model is the wrapper's default in `src/server/lib/ai/models.ts` (`MODEL_FLASH` today;
[#1324](https://github.com/xdjs/MusicNerdWeb/pull/1324) renames it `MODEL_DEFAULT`) at the commit
that ran. There is no runtime switch: to compare models, run the suite on two branches and compare
the two experiments in Braintrust. The experiment name and metadata (`suite`, `model`, `sha`)
record which was which.

## Baselines

Each suite has a **baseline experiment** on `google/gemini-2.5-flash` at the commit that landed
the suite, linked from #1329. A change is judged by comparing its experiment to that baseline in
Braintrust's experiment diff, and the diff link goes on the PR that makes the change. A baseline
is an experiment, not a number in a doc.

## Running

**GitHub Actions**, the normal way: the **Evals** workflow (`.github/workflows/evals.yml`),
*Run workflow*, pick the branch and the `suite`. One run at a time (a concurrency group), because
the research suite resets fixture artists on the staging database. Secrets it reads:
`BRAINTRUST_API_KEY`, `AI_GATEWAY_API_KEY`, `SUPABASE_DB_CONNECTION`, the Spotify client pair
(`src/env.ts` requires it at import) and the web-search key for the branch's provider,
`EXA_API_KEY` and `TAVILY_API_KEY` (the source search runs on Exa, discovery's last tier on
Tavily; an empty key means that job finds nothing). Providers, like the model, are a property of
the branch: set in code, never by a workflow input. Names only here; nothing in this repo holds a value.

**Locally**, for whoever has the same variables in `.env.local`:

```bash
npm run eval -- evals/smoke.eval.ts
```

`braintrust eval` bundles the file with esbuild (path aliases from `tsconfig.json`), runs it,
and prints the experiment link. The script passes `--external-packages=next` because the
research path imports `next/server`, which esbuild cannot bundle; anything else the suites
reach is bundled. `--no-send-logs` runs a suite without recording an experiment; `--list`
bundles and loads every suite without running one, which is the cheap check that a new
import still works outside Next.

Run the **smoke** suite first after touching the runner, the gateway credential or the
Braintrust credential: one model call, scored without a model, proving the wiring and nothing
about quality.

## Suites

| Suite | Data | Scorers | Status |
| --- | --- | --- | --- |
| `smoke` | one fixed prompt | `scoreExactMatch` | in this PR |
| `research` | `researchCases.ts`: the research benchmark's five hand-verified staging artists, with the #1273 Apple Music case on Pete Rango. Each is reset to its seed DSP ids, run through profile discovery and the source search as onboarding runs them, and read back the way the page reads it (`readResearchOutcome`). Seconds per case and discovery/vault errors ride along in the output. The run log carries one `[websearch] <provider> q=<query length> domains=<n> results=<n> <ms>ms` line per search call, with `error=<kind>` when it degraded to no results, so searches per provider can be counted off a run. | `scoreHandles` (as `discovery_handles` and `handles`), `scoreNoWrongHandles`, `scoreForbiddenHosts`, `scoreSourcesKept`, `scoreSourceRelevance` and `scoreSourceCoverage` (one judge call), `scoreLinkPlacement` | in this PR; baseline pending |
| `ask`, `about` | Dutchyyy own-source and open-web questions; About regeneration | `scoreCitations`, `scoreWithinBudget`, one judge each | #1329 row 3 |

A site not listed gets a suite when its flow changes, in the PR that changes it. No suite is
written ahead of a change.
