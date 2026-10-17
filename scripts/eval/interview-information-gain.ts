/** Synthetic editorial fixtures only; never writes artist data. Uses the deployed check prompt. */
import { readFileSync, writeFileSync } from 'node:fs';
import { generateText, Output } from 'ai';
import { interviewCheckSchema } from '../../src/lib/interviewApi/interviewPlanSchemas';
import { MODEL_INTERVIEW_CHECKER } from '../../src/server/lib/ai/models';
const code = readFileSync('src/server/utils/interviewApi/generateApiInterviewQuestion.ts', 'utf8');
const instructions = code.match(/instructions: `(First enumerate[\s\S]*?)`,/)?.[1];
if (!instructions) throw new Error('Cannot locate production checker prompt');
const fixtures = [
  { id: 'reported-known-genre', answer: 'I started my punk band.', question: 'What kind of music were you playing when you started that punk band?', adds: false },
  { id: 'heldout-known-instrument', answer: 'I played drums in a trio.', question: 'Which instrument did you play in the trio?', adds: false },
  { id: 'heldout-known-place', answer: 'We recorded the album in our kitchen.', question: 'Where did you record the album?', adds: false },
  { id: 'heldout-unresolved-experience', answer: 'I played drums in a trio.', question: 'What was playing with that trio like?', adds: true },
  { id: 'heldout-unresolved-example', answer: 'We recorded the album in our kitchen.', question: 'What do you remember most about recording in that kitchen?', adds: true },
  { id: 'heldout-specific-not-generic', answer: 'We recorded the album in our kitchen.', question: 'How did you arrange the instruments in the kitchen?', adds: true },
];
(async () => {
  const results = [];
  for (const fixture of fixtures) {
    const started = Date.now();
    const context = {
      asOf: '2026-10-17', sourceDates: [], previousQuestions: [],
      mandatoryMemory: { constraintsComplete: true, entries: [{ kind: 'latest_answer', fields: [{ name: 'answer', text: fixture.answer, complete: true }] }] },
      question: fixture.question,
      selectedAngle: { observation: fixture.answer, intendedUnknown: fixture.question, rationale: 'Follow the artist’s own account.', connection: 'single_observation' },
      evidence: [{ text: fixture.answer }], openedOriginals: [], olderPermittedHistory: [],
    };
    try {
      const result = await generateText({ model: MODEL_INTERVIEW_CHECKER, instructions,
        prompt: JSON.stringify(context), output: Output.object({ schema: interviewCheckSchema }),
        maxOutputTokens: 1800, maxRetries: 0, abortSignal: AbortSignal.timeout(45000) });
      const passed = result.output.addsNewInformation === fixture.adds;
      const row = { id: fixture.id, expected: fixture.adds, passed, verdict: result.output, usage: result.usage, ms: Date.now() - started };
      results.push(row);
      console.log(JSON.stringify({ id: row.id, passed, addsNewInformation: result.output.addsNewInformation, reason: result.output.reason, ms: row.ms }));
      if (!passed) process.exitCode = 1;
    } catch (error) {
      results.push({ id: fixture.id, error: error instanceof Error ? error.name : 'unknown' });
      process.exitCode = 1;
    }
  }
  writeFileSync('/tmp/mn1422-information-gain-results.json', JSON.stringify(results, null, 2));
})();
