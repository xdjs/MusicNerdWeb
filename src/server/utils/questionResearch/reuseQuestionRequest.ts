import { getQuestionRequestHash } from '@/lib/questionResearch/getQuestionRequestHash';
import type { PublicChatTurn } from '@/lib/questionResearch/publicChatTypes';
import { researchStatusSchema } from '@/lib/questionResearch/schemas';
import { acquireQuestionRequest } from './acquireQuestionRequest';
import { callResearchApi } from './callResearchApi';
import { getOrDraftResearchAnswer } from './getOrDraftResearchAnswer';
/** Revalidation is read-only: this path cannot plan, draft, advance jobs or collect. */
export async function reuseQuestionRequest(input: { artistId: string; artistName: string; question: string; conversation?: PublicChatTurn[]; signal?: AbortSignal }) {
  const requestHash = getQuestionRequestHash(input.artistId, input.question, input.conversation);
  const acquired = await acquireQuestionRequest(input.artistId, requestHash);
  if (acquired.state !== 'bound') return { ...acquired, requestHash };
  const { binding } = acquired;
  if (binding.job_id && binding.question_hash) {
    const state = researchStatusSchema.parse(await callResearchApi(
      `/api/artist/${input.artistId}/research/questions/${binding.job_id}`, { signal: input.signal },
    ));
    if (!['complete','unresolved','failed','cancelled'].includes(state.stage)) return { state: 'busy' as const, requestHash };
    if (binding.reusable && state.stage === 'complete') {
      const answer = await getOrDraftResearchAnswer({
        ...input, jobId: binding.job_id, references: state.references,
        readOnlyQuestionHash: binding.question_hash,
      });
      if (answer.state === 'ready' && answer.result.sources.length > 0) return { ...answer, limitations: state.limitations, requestHash };
      if (answer.state === 'drafting') return { state: 'busy' as const, requestHash };
    }
  }
  const retry = await acquireQuestionRequest(input.artistId, requestHash, binding.token);
  return retry.state === 'bound' ? { state: 'busy' as const, requestHash } : { ...retry, requestHash };
}
