# #1424 independent assessment — why chat still misses material facts

Claude, 2026-11-12. Read-only review of the November 12 handoff, the draft PRs, API main, and the
retained local run notes. No model calls, no paid runs, no code changes. Braintrust traces were not
accessible from this session; where the handoff's trace review is relied on, it is labeled as such.

Checked heads: API main `5cd1326`; API draft #112 head `acbb7bc` (branch `codex/1424-normal-local`)
plus local `f423625`; Web main `9be67aa4`; Web draft #1577 head `14ce352c`.

## Confirmed facts

1. **The quote-only "literal" mode does not exist on API main.** `lib/attributedChat/` is absent
   from `origin/main`; the main handler (`lib/chat/postArtistChatHandler.ts`, 111 lines) streams
   prose with `[n]` citations. The literal selector, the regex router and the attributed stream
   transform (16 files, ~1,900 lines) were introduced inside the merge commit `669bf7d` on
   November 6 (author p3t3rango). No earlier commit, issue comment, or `docs/rnd/decisions.md`
   entry records a decision to answer alias/first-release questions with verbatim passages.
   Production chat today is the prose composer from Sweetman's #1629 work plus PDF tools (#108).

2. **The November 12 failed answer exercised the draft's literal selector, not production.**
   The manifest's instruction hash is bound to the literal instructions; the run was on
   `codex/1424-normal-local` at `f3e9bd4`. Its result says nothing about the production composer.

3. **On production, the Dutchyyy timeline PDF is unreachable for an ordinary alias question.**
   On main, `searchPdfSources` is described as "Only use for document/PDF questions", the system
   prompt mentions PDF tools only under "For a PDF question", and `loadChatPdfs` ranks by title
   only. The draft fixes all three (instruction line about Lore PDFs for ordinary questions,
   new tool description, `extracted_text` ranking with a digest in the revision) but ships them
   bundled with the literal selector.

4. **The prose composer has never been run on the Dutchyyy alias question with PDF access.**
   The October 29 diagnostic (`89f689f`) predates #108 (merged October 30), so its alias answer
   came from Instagram. The November 7 approved single run has no result recorded in the repo.
   The November 12 run was literal. The comparison the handoff asks for has not happened.

5. **The regex router sends natural paraphrases and follow-ups to different modes.** Running
   `getAttributionFamily` locally:

   | Question | Route |
   | --- | --- |
   | Which years did Dutchyyy use each artist alias, and which were used at the same time? | alias-inventory |
   | What other names has Dutchyyy released music under? | alias-inventory |
   | When did he go by Dutchmassive, and was he also Dutchy at the same time? | prose |
   | Has Dutchyyy ever performed under a different name? | prose |
   | Timeline of Dutchyyy's aliases | prose |
   | Follow-up: Did those overlap? | alias-inventory |
   | Follow-up: Were Dutchy and Dutchmassive ever used on the same release? | prose |
   | Follow-up: Which one came first? | prose |
   | Follow-up: Which name came first? | alias-inventory |
   | Follow-up: What about The Chill Factor? | prose |

6. **The literal output contract forbids reasoning and fails whole on one bad character.** The
   model must emit newline-delimited `{"blocks":["<64-hex id>"]}` records and nothing else
   (handler instruction ending "No further composer follows"). `transformAttributedStream`
   rejects the entire answer on any malformed line or unknown ID. Nothing visible reaches the
   client until the final model step, so first visible content arrives after all tool steps.

7. **Effort is `low` on main and on the draft.** Commit `6da41cf` (November 4) set `medium`; the
   November 6 merge reverted it to `low` with the comment "no speculative effort change". The
   evaluator keeps `low` for the Anthropic route. Sonnet 5.5 at `low` keeps thinking short or
   skips it. Reported output for the failed run was 908 tokens across three calls, consistent
   with little or no reasoning before page selection. Whether the Vercel AI Gateway forwards
   `providerOptions.anthropic.effort` to Anthropic was not verifiable offline.

8. **The evaluator diverges from production in ways that matter for prose answers.** For PDF
   manifests it injects `maxOutputTokens: 1024`, `maxRetries: 0`, `streamRetries: 0`
   (`lib/evals/createGuardedChatExecution.ts`, `runSingleGuardedChatTurn.ts`). Production sets
   no output cap and uses SDK default retries. The cap did not truncate the November 12 run
   (finish reason was `stop`), but a prose answer plus adaptive thinking could hit it.

9. **The automated judge for the 11-case suite is Gemini 2.5 Flash.** `judgeCitedAnswer` calls
   `generateObject` with no model, which defaults to `MODEL_FLASH`. The judge model is not pinned
   in the experiment metadata. This is the judge that scored 97.27% while passing claims the
   manual review found unsupported. The single-run path has no automated judge at all; the
   November 12 "semantic FAIL" was a human reading of the private trace.

10. **Follow-ups lose the previous answer after a PDF read, on main as well as on the draft.** On
    main, `validateArtistChatBody` drops any assistant message containing a PDF tool part from
    the history. On the draft, a literal answer is replaced by an "untrusted navigation hints"
    text block. In both cases the model cannot see what the fan was shown.

11. **In literal mode the model receives the PDF twice**: once as JSON page text with block IDs
    (about 44K characters for the 13-page timeline, per the retained run note) and once as the
    native PDF file. Reported input was about 81K tokens across three calls, about $0.17.

12. **Source content was not independently verified.** That page 2 holds The Chill Factor's
    2001 credit and page 8 the 2013 same-release Dutchy/Dutchmassive overlap comes from the
    November 12 trace review and the corrected reference in `correctedChatCases.ts`.

## Hypotheses (not established)

- H1. The omission is the predictable result of asking a low-effort model to enumerate every
  relevant page of a 13-page document in one no-reasoning output. Falsified if a medium-effort
  literal run or a prose run on the same evidence includes both missing facts.
- H2. The local coverage-checklist patch (`f423625`) will help little in literal mode because it
  tells the model to check coverage and then forbids writing the checklist.
- H3. The gateway honors `effort: low`. If it does not, the model runs at default `high` and H1
  weakens; the provider request metadata in the Braintrust trace would settle this.

## Answers to the handoff's questions

**Is the question/eval fair?** The question is fair and representative of what a fan would
ask. It is also the hardest shape: multi-part inventory plus overlap, answerable only from a
13-page PDF that production never opens for an ordinary question. The 11-case suite is fine as
a regression set; its automated judge is not trustworthy for acceptance. The single-run,
human-reviewed path is the right acceptance instrument. The evaluator must match production
settings (no output cap or a generous one, SDK retries, same effort) or it measures a different
system.

**Which layer?** Several, in this order of impact:

1. Retrieval reachability on production (PDFs gated to PDF questions). Small fix, already
   written on the draft.
2. Composition contract on the draft (quote-only, no composer). Wrong product contract for
   "useful, accurate, source-grounded conversation"; slow; brittle. Should not merge as the
   answer path.
3. Routing (regex). Only exists to serve 2; goes away with it.
4. Evaluation (judge model, production parity). Fix settings; keep human review.
5. Client rendering. The draft's passage renderer does what it says; not a cause.

**Preserve / simplify / remove.**

- Preserve on main: streaming prose with `[n]` citations, the six tools, source eligibility and
  revision checks, PDF physical-page citations, the human-reviewed single-run harness.
- Port from the draft to main as a focused PR: the ordinary-question PDF instruction
  (`buildArtistChatInstructions` line 18), the `searchPdfSources` description, the
  `extracted_text` ranking and extraction digest in `loadChatPdfs`, the discovery locator for
  `readSource` (`createSearchSourcesTool` / `rankChatSourceOriginals`) if its tests are green.
- Do not merge as the answer path: `getAttributionFamily`, `transformAttributedStream`,
  `createAttributionRegistry`, `registerPdfPages`, the literal instruction branch, the Web
  `AttributedPassages` route. If verbatim passages are wanted later, they belong as an optional
  attachment beside a prose answer, not instead of one.
- Pause: the hosted two-turn bridge, encrypted receipts, pair manifests. They solve a review
  logistics problem that a single run plus a manual follow-up does not have.

## Smallest change and how to test it

Step 0, no code (one bounded run, about $0.20): run the frozen Dutchyyy question through the
draft branch with the family forced to `null` so the prose path runs with PDF reachability.
Read the answer by hand against the corrected reference. If it names the four aliases with the
PDF's years, mentions the 2013 same-release overlap, qualifies "documented in 2001" versus
"used from", and cites the PDF with page numbers, the literal selector is not needed. If it
omits the same facts, the problem is model attention over the document and the next lever is
effort `medium` on the same path, one more run.

Step 1, code (about 30 lines, main-based branch, `Refs #1424`): port the three PDF
reachability changes listed above. Add a unit test that an alias question without the word
"PDF" produces instructions naming `searchPdfSources` as a corpus for ordinary questions, and a
`loadChatPdfs` test that a topic term in extracted text ranks the PDF.

Step 2, code (one line): `anthropicEffort: "medium"` for chat if Step 0 shows a quality gap at
`low`. Measure first-text and total time on the 11 cases before keeping it.

Step 3, evaluator parity: remove or raise the 1024 output cap for prose runs, restore SDK
retries, pin the judge model in metadata, and run the judge on Sonnet 5.5 or Opus 5.5 with a
per-claim verdict. Keep the Flash score as "diagnostic only" if retained for comparability.

Frozen set for acceptance (the handoff's six): the Dutchyyy question; two paraphrases that
route to prose today; a realistic follow-up ("Were Dutchy and Dutchmassive ever used on the
same release?"); an artist with no PDF; the Willie Colón conflicting-first-album case; the
Dutchyyy favorite-food unanswerable case.

## Acceptance criteria

Per answer, judged by a human against captured passages: every material fact the question asks
for is present; every claim is supported by its cited passage; conflicts are stated as
conflicts; uncertainty is stated where the source only documents a single year; first visible
text within five seconds and completion within twenty seconds on the production settings; cost
per question recorded. A green test suite and a clean transport are not acceptance.

## What remains unproven

- That the prose composer with PDF access produces the complete Dutchyyy answer (Step 0).
- That `medium` effort improves completeness without breaking the 20-second target.
- That the gateway forwards the effort setting.
- The PDF page contents themselves (not read in this review).
- Any multi-turn behavior after a PDF-based answer; fact 10 predicts a regression on both paths.

## Where I disagree with the handoff

- "This restriction exists in the real API, not only in the evaluator." It exists in the draft
  PR, not in deployed main. Production answers in prose.
- "Strong evidence of a selection/composition problem." Agreed for the draft's selector. The
  larger production problem, PDF reachability, could not show up in that run because the draft
  already fixes it.
- The coverage-prompt patch is not worth a paid run in literal mode.
- The audit's process findings are right; the remedy is fewer harness layers, not a hosted
  bridge. One run, one human read, one small PR.
