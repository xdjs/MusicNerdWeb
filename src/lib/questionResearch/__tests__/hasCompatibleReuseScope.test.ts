import { hasCompatibleReuseScope } from '../hasCompatibleReuseScope';
import type { QuestionReuseCandidate } from '../reuseTypes';
const routing={topic:'Glass Harbor producer',evidenceNeed:'credits',freshness:'stored',retrieval:'relevance',answerScope:'focused'};
const candidate:QuestionReuseCandidate={id:'a',jobId:'j',questionHash:'h',intent:'Identify producer',routing,answer:'Ari produced Glass Harbor.',passages:[]};
it('permits semantic topic paraphrases but preserves explicit constraints',()=>{
 expect(hasCompatibleReuseScope({...routing,topic:'production credit on Glass Harbor'},candidate)).toBe(true);
 const deltas:Record<string,string|string[]>[] = [{platform:'instagram'},{targetUrl:'https://example.com/x'},{fromDate:'2026-01-01'},{toDate:'2026-02-01'},{retrieval:'latest'},{freshness:'recent'},{excludeSourceUrls:['https://example.com/excluded']},{evidenceNeed:'spoken_content'}];
 for(const delta of deltas)
 expect(hasCompatibleReuseScope({...routing,...delta},candidate)).toBe(false);
});
it('a different evidence need requires adaptation, never the same saved answer',()=>{
 const changed={...routing,evidenceNeed:'reporting'};
 expect(hasCompatibleReuseScope(changed,candidate)).toBe(false);
 expect(hasCompatibleReuseScope(changed,candidate,'adapt_evidence')).toBe(true);
 expect(hasCompatibleReuseScope({...changed,targetUrl:'https://example.com/new'},candidate,'adapt_evidence')).toBe(false);
});
