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
| `src/server/lib/ai/models.ts` | The only place model ids live: `MODEL_FLASH = "google/gemini-2.5-flash"`, `MODEL_PRO = "google/gemini-2.5-pro"`. Constants module; the one allowed multi-export. |
| `src/server/lib/ai/generateText.ts` | One exported function, `generateText`, wrapping `ai`'s `generateText`. Takes `{ model, instructions, prompt, temperature, thinkingBudget, timeoutMs, output, tools }`, defaults `model` to `MODEL_FLASH`, turns `thinkingBudget` into `providerOptions.google.thinkingConfig`, and `timeoutMs` into `abortSignal: AbortSignal.timeout(ms)`. Returns the SDK result (`text`, `output`, `sources`, `usage`). Its test lives beside it. |
| Each call site (table below) | Imports the wrapper and passes exactly the config in its row. Tests mock the wrapper, as they mock `@/server/lib/gemini` today. |

Removed by the switch: `src/server/lib/gemini.ts` (`@google/genai`), `src/server/lib/openai.ts`
(`openai`, never called at runtime), and the `GEMINI_API_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL`,
`OPENAI_TIMEOUT_MS` exports from `src/env.ts`.

Packages, pinned exact: `ai` (7.x) and `@ai-sdk/google` (only for `google.tools.googleSearch`
and the `providerOptions.google` types). The gateway provider is bundled in `ai`; a plain
`provider/model` string routes through it. Structured output uses `Output.object({ schema })`
with zod: Recoup uses `generateObject` on AI SDK 6, and AI SDK 7 deprecates it in favour of
`generateText` with an `output` setting. The repo's installed zod (3.25.x) satisfies the SDK's
peer range.

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
| 4 | `queries/artistBioQuery.ts` `generateArtistBio` | About bio, grounded when `useGrounding` | **pro** | `google_search` when grounded | 15 s → `"Gemini timeout"` → route's 408 | `/api/artistBio/[id]`, `regenerateArtistBio`, `scripts/backfill-ai-bios.ts` |
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

## How each Gemini option maps

- **System instruction** → `instructions` (AI SDK 7's name; `system` is the deprecated alias).
  Prompt text is unchanged, byte for byte.
- **`temperature`** → `temperature`, same value.
- **`thinkingConfig.thinkingBudget`** → the wrapper's `thinkingBudget`, same number, sent as
  `providerOptions: { google: { thinkingConfig: { thinkingBudget } } }`. Sites without a budget today pass none.
- **`responseMimeType: "application/json"` + hand-parsed JSON** → `output: Output.object({ schema })`
  with a zod schema declared beside the site. The shape is the one the site already parses; the
  fence-stripping and `JSON.parse` fallbacks go away because the SDK validates the object.
  Invalid output throws, and the site turns that into the same failure path a parse error took.
- **`tools: [{ googleSearch: {} }]`** → `tools: { google_search: google.tools.googleSearch({}) }`,
  a provider-executed tool. Site 2 reads `result.sources` (each has a `url`) and takes the URL's
  hostname for `webDomains` and the blocklist check, replacing today's
  `groundingMetadata.groundingChunks[].web.title`. The blocklist fixtures in
  `groundedFallback.test.ts` define the expected outcome and must pass unchanged.
- **`Promise.race` timeouts** → the wrapper's `timeoutMs`, same number, enforced with
  `abortSignal: AbortSignal.timeout(ms)`. Each site catches the abort and produces exactly what it
  produced before: the error message in the table (callers match on it), `null`, or `undefined`.
- **Response text** → `result.text`.

## Swapping a model

Change one constant in `src/server/lib/ai/models.ts`. Any gateway model id works
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

Tests mock `@/server/lib/ai/generateText` instead of `@/server/lib/gemini`. Assertions that read
`generateContent.mock.calls[0][0].config.systemInstruction` read the wrapper's `instructions`,
`thinkingBudget`, `output` and `tools` arguments instead. No test is removed; the nine files
affected are the ones that import the old module. The wrapper's own test covers the two
translations it owns: the thinking budget lands under `providerOptions.google`, and a timeout
aborts the call.

## Verification

"Behaviour unchanged" means, on a preview built from the PR's SHA, against staging data:

- Ask on Dutchyyy answers from our sources with the same citation pills; an open-web question
  returns `fromOpenWeb: true` with `webDomains` populated and a blocklisted host absent.
- About regenerates for an artist; a fun fact renders.
- Onboarding ack, interview questions and the verifier run for a claimed test artist.
- `/api/research/advance` runs `extractCaptionCredits` and `refreshArtistDoc` on one artist with the
  same outcome as before.
- The AI Gateway dashboard shows those calls by model with cost.
- `git grep getGemini` is empty; `npm run ci` is green; the stub build runs without an LLM variable.
- Per-site timings recorded on the PR next to the pre-switch numbers (the 90 s caption batch is
  the one to watch).
