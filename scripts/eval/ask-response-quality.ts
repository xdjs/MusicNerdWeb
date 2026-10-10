import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {generateText,Output} from 'ai';
import {z} from 'zod';
import {answerDraftSchema} from '../../src/lib/questionResearch/schemas';
import {matchesOriginalQuote} from '../../src/lib/questionResearch/matchesOriginalQuote';
const candidate=readFileSync('src/server/utils/questionResearch/draftResearchAnswer.ts','utf8');
const baseline=execFileSync('git',['show','7d2ad568:src/server/utils/questionResearch/draftResearchAnswer.ts'],{encoding:'utf8'});
const prompts=(text:string)=>[...text.matchAll(/instructions: `([\s\S]*?)`,/g)].map(m=>m[1]);
const original=(n:number,title:string,description:string,date='2026-10-07')=>({n,sourceId:`latest:inprocess:${String(n).repeat(64)}`,revision:'a'.repeat(64),text:JSON.stringify({provider:'inprocess',title,description,collection_name:'Archive',created_at:date+'T12:00:00Z'}),publishedAt:null,activityDate:date,activityDateKind:'moment',incomplete:false});
const fixtures=[
 {id:'heldout-credit-handles',artistName:'Mira Vale (fictional)',question:"What's new with Mira?",originals:[{...original(1,'Visualizer announcement','The NIGHT WINDOWS visualizer is out. Filmed by @novalens. Music produced by @soundbymira + @whoisren. Executive produced by @mxcollective.'),sourceId:'social:fixture:caption'},original(2,'Album reflection','I carried this project for five years. I took my first modeling class this week.')],note:'Do not expand handles into names or identities, mix credit roles, or invent continuous work duration.'},
 {id:'heldout-excluded-archive',artistName:'Mira Vale (fictional)',question:'What else has Mira been doing besides the Archive project?',originals:[original(1,'Cell Graveyard / artwork for Archive voice memo','This is the phone graveyard photo I used for my Archive voice memo post. Switching phones has felt strange.')],note:'Only excluded activity: expected no factual answer, not a new update.'},
 {id:'heldout-other-activity',artistName:'Mira Vale (fictional)',question:'What else has Mira been doing besides the Archive project?',originals:[original(1,'Cell Graveyard / artwork for Archive voice memo','This is the phone graveyard photo I used for my Archive voice memo post.'),{...original(2,'Sampling workshop','I am teaching a free sampling workshop on October 18.'),text:JSON.stringify({provider:'inprocess',title:'Sampling workshop',description:'I am teaching a free sampling workshop on October 18.',collection_name:'Workshops'})}],note:'Select the independent workshop, omit archive artwork.'},
 {id:'archival-overview',artistName:'Dutchyyy',question:"What's the latest on Dutchyyy?", originals:[original(1,'Esc_Ape.mp3 (2013) Ape Escape Flip','Sadly no, uncompressed .WAV of this one exists =/ I keep searching tho. Searching For A Save Point'), original(2,'Cell Graveyard / original capture for voice memo thumbnail',"Life been kinda wack since I switched from Android to Iphone... probably unrelated."),original(3,'Analog Archival: Tough Guy / Tiny Voice 1998','Digitizing Cassettes.','2026-10-02')],note:'Public post wording captured from the real staging profile; these eval envelopes are fixtures, not database reads.'},
 {id:'heldout-two-activities',artistName:'Mira Vale (fictional)',question:"What's new with Mira?", originals:[original(1,'Studio notes 07.wav','I am trying a stripped-back arrangement of an older song. No release date yet.','2026-10-09'),original(2,'Community workshop','I am teaching a free sampling workshop on October 18.','2026-10-08'),original(3,'Session photo','Another day trying the stripped-back arrangement.','2026-10-08')],note:'Synthetic held-out fixture, never artist knowledge.'},
 {id:'heldout-search-qualification',artistName:'Mira Vale (fictional)',question:'Does the original WAV still exist?',originals:[original(1,'Archive search','I have not found the original WAV. I still have two drives to check.')],note:'Synthetic held-out fixture.'},
];
(async () => {
  const results = [];
  for (const fixture of fixtures.filter(f => !process.env.ASK_QUALITY_CASE || f.id.startsWith(process.env.ASK_QUALITY_CASE))) {
    for (const mode of process.env.ASK_QUALITY_MODE ? [process.env.ASK_QUALITY_MODE] : ['before', 'after']) {
      const [draftInstructions, checkInstructions] = prompts(mode === 'before' ? baseline : candidate);
      const input = { ...fixture, currentDate: '2026-10-10' };
      const started = Date.now();
      const attempts = [];
      let repairFeedback: { reason: string; rejectedDraft: z.infer<typeof answerDraftSchema> } | undefined;
      let accepted = false;
      const signal = AbortSignal.timeout(45000);
      try {
        for (let attempt = 0; attempt < 2; attempt++) {
          const d = await generateText({ model: 'google/gemini-3.8-flash', instructions: draftInstructions,
            prompt: JSON.stringify({ ...input, ...(repairFeedback ? { repairFeedback } : {}) }),
            output: Output.object({ schema: answerDraftSchema }), providerOptions: { google: { thinkingConfig: { thinkingLevel: 'low' } } },
            temperature: .2, maxOutputTokens: 2400, maxRetries: 0, abortSignal: signal });
          const draft = d.output;
          const quotes = draft.sentences.every(sentence => sentence.evidence.every(e => {
            const original = fixture.originals.find(o => o.n === e.n);
            return e.field === 'activityDate' ? e.quote === original?.activityDate
              : e.field === 'publishedAt' ? false : matchesOriginalQuote(original?.text ?? '', e.quote);
          }));
          let check = { supported: false, reason: 'Use exact supporting quotes from the supplied original fields.' };
          let checkUsage;
          if (quotes && !draft.sentences.length) check = { supported: true, reason: 'No factual sentences.' };
          else if (quotes) {
            const checked = await generateText({ model: 'anthropic/claude-opus-5.5', instructions: checkInstructions,
              prompt: JSON.stringify({ input, draft }), output: Output.object({ schema: z.object({ supported: z.boolean(), reason: z.string().max(500) }) }),
              maxOutputTokens: 1500, maxRetries: 0, abortSignal: signal });
            check = checked.output;
            checkUsage = checked.usage;
          }
          attempts.push({ draft, quotes, check, usage: { draft: d.usage, check: checkUsage } });
          if (quotes && check.supported) { accepted = true; break; }
          repairFeedback = { reason: check.reason, rejectedDraft: draft };
        }
        const row = { id: fixture.id, mode, accepted, attempts, ms: Date.now() - started };
        results.push(row);
        console.log(JSON.stringify(row));
        if (!accepted) process.exitCode = 1;
      } catch (error: unknown) {
        const row = { id: fixture.id, mode, accepted: false, attempts, error: error instanceof Error ? error.name : 'unknown', ms: Date.now() - started };
        results.push(row);
        console.log(JSON.stringify(row));
        process.exitCode = 1;
      }
    }
  }
  writeFileSync(process.env.ASK_QUALITY_RESULTS ?? '/tmp/musicnerd-ask-quality-results.json', JSON.stringify(results, null, 2));
})();
