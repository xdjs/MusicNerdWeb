import { writeFileSync } from "node:fs";
import { planArtistQuestion } from "../../src/server/utils/questionResearch/planArtistQuestion";

// Real public answer from the failed preview. No artist data is written.
const conversation = [{
  question: "What's the latest on Dutchyyy?",
  answer: "Dutchyyy has been digging through their archives, sharing a 2013 Ape Escape flip while continuing to search for an uncompressed WAV. They also shared a 2013 phone voice memo of songwriting rambles and recovered beat snippets from 2002 to 2005 originally made on an MPC2000 and FL Studio.",
  sourceUrls: [101, 99, 96].map(n => `https://www.inprocess.world/collect/base:0xbfaab1564b7faac7cbc2855dbc96e8b9623a5b1b/${n}`),
}];

async function main() {
  const started = Date.now();
  const plan = await planArtistQuestion(
    "Dutchyyy",
    "What else have they been up to besides the archival posts?",
    undefined,
    conversation,
  );
  const result = { plan, ms: Date.now() - started };
  writeFileSync(process.env.ASK_SCOPE_RESULT ?? "/tmp/musicnerd-ask-followup-scope.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  // A named-recording list cannot substitute for the excluded category.
  if (![plan.topic, plan.resolvedQuestion].every(value => /archiv/i.test(String(value)))
      || plan.answerScope !== "overview" || plan.retrieval !== "latest") {
    throw new Error("The explicit archival category or latest overview scope was lost");
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
