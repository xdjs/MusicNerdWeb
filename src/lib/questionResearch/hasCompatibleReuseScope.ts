import type { QuestionReuseCandidate } from './reuseTypes';
/** Semantic choice cannot override explicit routing boundaries. */
export function hasCompatibleReuseScope(routing: QuestionReuseCandidate['routing'], candidate: QuestionReuseCandidate, action: string = "same_answer"): boolean {
  if (routing.retrieval === 'latest' || routing.freshness === 'recent' || routing.fromDate || routing.toDate) return false;
  return ['platform','targetUrl','fromDate','toDate','retrieval','freshness','evidenceNeed','answerScope','excludeSourceUrls','evidenceFacets']
    .filter(key => action !== 'adapt_evidence' || !['evidenceNeed','answerScope'].includes(key))
    .every(key => JSON.stringify(routing[key] ?? null) === JSON.stringify(candidate.routing[key] ?? null));
}
