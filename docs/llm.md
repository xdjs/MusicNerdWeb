# LLM calls — contract

Every model call in this app goes through [Vercel AI Gateway](https://vercel.com/docs/ai-gateway)
using the [AI SDK](https://ai-sdk.dev/docs). There is no direct Gemini or OpenAI client.
This is the contract for those calls: which sites exist, what each one must preserve, how a
model is swapped, and where cost shows. Delivery is tracked on
[#1265](https://github.com/xdjs/MusicNerdWeb/issues/1265) (row 1); the model *choice* is
tracked separately on [#1259](https://github.com/xdjs/MusicNerdWeb/issues/1259).

> **Decision 2026-09-15 (Sweetman, agreed by Carl and Pete at the 2026-09-14 standup).**
> Route every hard-coded Gemini call through AI Gateway via the AI SDK, on the **same Gemini
> models**, so behaviour is unchanged on day one. One key already on the Vercel project,
> provider-agnostic model strings, per-call cost in one dashboard. Switching models is a
> one-line change made later, on evidence, under #1259.

## Modules

The shape mirrors [recoupable/app](https://github.com/recoupable/app) (`lib/ai/generateText.ts`,
model ids in `lib/consts.ts`), which Sweetman already runs on AI Gateway: callers import one thin
wrapper, never `ai` directly, and model ids are plain `provider/model` strings in one constants
module.

| Path | Role |
| --- | --- |
| `src/server/lib/ai/models.ts` | The only place model ids live: `MODEL_DEFAULT`, used by every site, and `MODEL_GROUNDED` (`google/gemini-2.5-flash`), used when a site asks for Google Search grounding, which only Gemini provides. The current value of `MODEL_DEFAULT` is in the file and in the trial callout below. |
| `src/server/lib/ai/generateText.ts` | One exported function, `generateText`, wrapping `ai`'s `generateText`. Takes `{ model, instructions, prompt, temperature, thinkingBudget, googleSearch, output }`; picks `MODEL_GROUNDED` when `googleSearch` is set and `MODEL_DEFAULT` otherwise; turns `googleSearch: true` into the provider-executed `google.tools.googleSearch({})`; maps `thinkingBudget` per provider (below). Logs one line per call, `[ai] <model> <ms>ms in=<n> out=<n> reasoning=<n> gen=<generation id>`, so a runtime-log request carries what a cost lookup (`GET /v1/generation?id=`) needs. Returns the SDK result (`text`, `output`, `sources`, `usage`). |
| `src/server/lib/ai/generateArray.ts` | `generateArray({ element, ...same })`: the reply is a list validated against the zod `element` schema (`Output.array`). Sites 3, 9, 10, 11. Mirrors Recoup's `lib/ai/generateArray.ts`. |
| `src/server/lib/ai/generateObject.ts` | `generateObject({ schema, ...same })`: the reply is one object validated against the zod `schema` (`Output.object`). Site 12. |
| Each call site (table below) | Imports one of the three and passes exactly the config in its row. Nothing outside `src/server/lib/ai` imports `ai` or `@ai-sdk/google`. Tests mock the helper the site imports, as they mocked `@/server/lib/gemini`. |

Removed by the switch: `src/server/lib/gemini.ts` (`@google/genai`), `src/server/lib/openai.ts`
(`openai`, never called at runtime), and the `GEMINI_API_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL`,
`OPENAI_TIMEOUT_MS` exports from `src/env.ts`.

Packages, pinned exact: `ai` (7.x) and `@ai-sdk/google` (only for `google.tools.googleSearch`
and the `providerOptions.google` types). The gateway provider is bundled in `ai`; a plain
`provider/model` string routes through it. Structured output uses `Output.object({ schema })`
and `Output.array({ element })` with zod: Recoup uses `generateObject` on AI SDK 6, and AI SDK 7
deprecates it in favour of `generateText` with an `output` setting. The repo's installed zod
(3.25.x) satisfies the SDK's peer range. Both packages are ESM-only, so `jest.config.ts` maps
them to `src/test/__mocks__/ai.ts` and `ai-sdk-google.ts`; the three helpers' own tests replace
those with explicit `jest.mock` factories.

## Authentication

| Environment | Credential | Set by |
| --- | --- | --- |
| Vercel (production, preview, and the custom staging environment) | `AI_GATEWAY_API_KEY` project env var | Carl, 2026-09-15 ([#1259 comment](https://github.com/xdjs/MusicNerdWeb/issues/1259)) |
| Local | `AI_GATEWAY_API_KEY` in `.env.local`, or the `VERCEL_OIDC_TOKEN` written by `vercel env pull` (expires after 12 h) | you |

The SDK reads `AI_GATEWAY_API_KEY` first and falls back to the OIDC token. Nothing in
`src/env.ts` validates the key: a missing key fails at the first call, not at build time, which is
the same boundary `GEMINI_API_KEY` had. The stub build needs no LLM variable.

`GEMINI_API_KEY` and `OPENAI_API_KEY` stay on the Vercel project until the release that carries
this switch is verified on production, then Pete or Carl remove them (rollback path: revert the
release; the old keys are still there).

## Call sites

Fourteen sites in eight files. Every column is a contract: the switch may not change a model,
temperature, thinking budget, timeout, or the error a caller matches on.

| # | Site | Purpose | Model | Config | Timeout → on timeout | Surface |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `api/askArtist/route.ts` main answer | Answer from our sources, citation markers | flash | temp 0.5 | 20 s → `"Gemini timeout"` → HTTP 408 | Ask (user) |
| 2 | `api/askArtist/route.ts` open-web fallback | Answer with Google Search grounding; `webDomains` + blocklist | flash | temp 0.4, `google_search` | 15 s → resolves `null`, route answers "don't know" | Ask (user) |
| 3 | `api/askArtist/route.ts` `suggestFollowUps` | 4 follow-up questions | flash | temp 0.4, JSON schema, thinking 0 | 4 s outer race → `generateFollowUps` fallback | Ask (user) |
| 4 | `queries/artistBioQuery.ts` `generateArtistBio` | About bio, grounded when `useGrounding` | flash (was pro; see below) | `google_search` when grounded | 15 s → `"Gemini timeout"` → route's 408 | `/api/artistBio/[id]`, `regenerateArtistBio`, `scripts/backfill-ai-bios.ts` |
| 5 | `artistDocService.ts` `synthesizeArtistDoc` | Knowledge document from sources | flash | temp 0.4, thinking 0 | 15 s → `"Gemini timeout"` | onboarding, `refreshArtistDoc` |
| 6 | `artistDocService.ts` `generateAboutFromDoc` | About from the document | flash | temp 0.5, thinking 0 | 12 s → `"Gemini timeout"` | onboarding |
| 7 | `artistDocService.ts` `synthesizeFallbackAbout` | About without a document | flash | temp 0.5, thinking 0 | 12 s → `"Gemini timeout"` | onboarding |
| 8 | `artistDocService.ts` `generateLoreSummary` | Two-sentence Lore inventory overview | flash | temp 0.2, thinking 0 | 12 s → returns `undefined`, never throws | `refreshArtistDoc` (runs alongside #5) |
| 9 | `questionGenerator.ts` `generateGroundedQuestions` | Interview questions from posts | flash | temp 0.8, JSON schema | 30 s → `"questionGenerator timeout"` | interview, onboarding |
| 10 | `questionGenerator.ts` verifier | Question vs source statement | flash | temp 0, JSON schema, thinking 512 | 12 s → `"verifier timeout"` | same |
| 11 | `sourceRelevance.ts` `judgeSourceRelevance` | Is this page about this artist | flash | temp 0, JSON schema, thinking 0 | 20 s → `"relevance judge timeout"` | `vaultWebSearch` |
| 12 | `socialCredits.ts` `extractCaptionCredits` | Credits from Instagram captions, 15 per batch | flash | temp 0, JSON schema | 90 s → `"caption extraction timed out"` | `researchRunner`, `socialIngest` |
| 13 | `onboarding/turnHandlers.ts` ack | One-line chat acknowledgement | flash | temp 0.7, thinking 0 | 5 s → `"ack timeout"` | onboarding chat |
| 14 | `api/funFacts/[type]/route.ts` | Fun fact | flash | temp 0.8 | 15 s → `"Gemini timeout"` → HTTP 408, inside the route's 20 s budget | profile (user) |

Site 8 was added after the 2026-09-15 inventory on #1265 (which counted thirteen).

> **Decision 2026-09-21 (Sweetman, on #1259): About moves from `google/gemini-2.5-pro` to Flash.**
> The gateway refused Pro on the team's free tier during preview verification of #1322
> (403 `RestrictedModelsError`); Flash is free-tier, About runs ungrounded, and every other site
> already uses Flash. Pro was the only exception, so `MODEL_PRO` is gone. Free-tier model list:
> vercel.com/ai-gateway/models?freeTier=true.

> **Trial 2026-09-22 (Sweetman, #1324): `deepseek/deepseek-v4.1-flash` and `moonshotai/kimi-k3` were
> each made `MODEL_DEFAULT` for one preview and measured against the Gemini baseline; both
> degraded About, the lore refresh and caption extraction against the existing 15 s and 60 s
> budgets, and Kimi cost 5–10× more per call.** Model 3, `xiaomi/mimo-v2.6-pro` (free tier,
> $0.435 / $0.87 per million, reasoning toggle with `none`), is measured the same way on the next
> preview. Between trials `MODEL_DEFAULT` returns to Gemini. The routing
> (`MODEL_GROUNDED` for grounded calls), the provider-aware reasoning mapping and the per-call log
> line stay. Tables on the PR; the model decision remains #1259's. The "flash" entries in the table below read as `MODEL_DEFAULT` unless the site is grounded.

## How each Gemini option maps

- **System instruction** → `instructions` (AI SDK 7's name; `system` is the deprecated alias).
  Prompt text is unchanged, byte for byte.
- **`temperature`** → `temperature`, same value.
- **`thinkingConfig.thinkingBudget`** → the wrapper's `thinkingBudget`, same number. On a Gemini model it
  is sent as `providerOptions: { google: { thinkingConfig: { thinkingBudget } } }`; on any other provider
  it becomes the SDK's `reasoning` level, `none` for 0 and `low` otherwise, because token budgets are
  Gemini-specific. Sites without a budget pass none and get the provider's default, which for a
  reasoning model means reasoning on.
- **`responseMimeType: "application/json"` + hand-parsed JSON** → `generateArray({ element })` or
  `generateObject({ schema })` with a zod schema declared at the site, every field optional so the
  shape is exactly what the site already tolerated. The fence-stripping and `JSON.parse` fallbacks
  go away because the SDK validates the reply. A reply that fails validation rejects the call with
  `AI_NoObjectGeneratedError` (or `AI_NoOutputGeneratedError` when empty), and each site maps that
  to the path a parse error took: follow-ups fall back to the static list, the verifier and the
  relevance judge leave everything undecided, and caption extraction re-reads the raw reply the
  error carries with the old lenient parser, so one mistyped item cannot cost a batch its valid
  siblings (`verifyClaims` checks every field itself).
- **`tools: [{ googleSearch: {} }]`** → `googleSearch: true`, the provider-executed
  `google.tools.googleSearch({})`. Site 2 reads `result.sources`: the SDK maps each grounding chunk
  to a source whose **`title` is `web.title`, the registrable domain**, and whose `url` is
  `web.uri`, an opaque vertexaisearch redirect. So `webDomains` and the blocklist check key on
  `title`, exactly as they keyed on `web.title` before (#1265's note that the URL would be a
  better key was wrong: there is no page URL to read). The blocklist fixtures in
  `groundedFallback.test.ts` define the expected outcome.
- **`Promise.race` timeouts** stay as they are: each site keeps its own race, the same number
  and the same error message its callers match on. The SDK call is not aborted when the race is
  lost, which is also what happened before.
- **Retries** are the SDK's default, 2 on retryable errors (`ai` 7: `maxRetries` "Default: 2").
  The old client retried more: `@google/genai` 1.45.0 defaulted to 5 attempts including the first
  (`DEFAULT_RETRY_ATTEMPTS`), on 429 and 5xx, and no site overrode it. A lost race leaves the
  request retrying in the background under both.
- **Response text** → `result.text`.

## Swapping a model

Change the constant in `src/server/lib/ai/models.ts`, or pass `model` at one site. Any gateway model id works
(`anthropic/…`, `openai/…`, `deepseek/…`): list them with
`curl -s https://ai-gateway.vercel.sh/v1/models`. Two things do not carry across providers and
must be checked before a swap: `google_search` grounding (sites 2 and 4) and the
`providerOptions.google` thinking budget (sites 3, 5–8, 10, 11, 13). Record the choice and the
evidence on #1259.

## Cost and logs

The Vercel dashboard for project `music-nerd` (team `musicnerd`) → **AI Gateway** shows every
request by model with tokens, latency and cost, for previews and production alike. Prompt and
completion text are not logged. `result.usage` carries the token counts per call if a site ever
needs to record them.

## Tests

Tests mock the helper a site imports (`@/server/lib/ai/generateText`, `generateArray` or
`generateObject`) instead of `@/server/lib/gemini`, and resolve `{ text }` or `{ output }`.
Assertions that read `generateContent.mock.calls[0][0].config.systemInstruction` read
`instructions`, `prompt`, `thinkingBudget` and `googleSearch` instead. The nine affected files are
the ones that imported the old module. One test file is gone: `src/__tests__/env.test.ts` only
covered `OPENAI_MODEL`, which this switch removes. The helpers' own tests cover the translations
they own: model default, thinking budget under `providerOptions.google`, the search tool only when
asked, and `Output.array` / `Output.object` wrapping.

## Verification

"Behaviour unchanged" means, on a preview built from the PR's SHA, against staging data:

- Ask on Dutchyyy answers from our sources with the same citation pills; an open-web question
  returns `fromOpenWeb: true` with `webDomains` populated and a blocklisted host absent.
- About regenerates for an artist; a fun fact renders.
- Onboarding ack, interview questions and the verifier run for a claimed test artist.
- `/api/research/advance` runs `extractCaptionCredits` and `refreshArtistDoc` on one artist with the
  same outcome as before.
- The AI Gateway dashboard shows those calls by model with cost.
- `git grep getGemini` is empty and nothing outside `src/server/lib/ai` imports `ai`; `npm run ci`
  is green; the stub build runs without an LLM variable.
- Per-site timings recorded on the PR next to the pre-switch numbers (the 90 s caption batch is
  the one to watch).
