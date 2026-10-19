import { createHash } from 'node:crypto';
import type { PublicChatTurn } from './publicChatTypes';
/** Exact, versioned public request identity. Never a semantic similarity key. */
export function getQuestionRequestHash(artistId: string, question: string, conversation: PublicChatTurn[] = []): string {
  return createHash('sha256').update(JSON.stringify([
    'public-request-v1', artistId, question,
    conversation.map(turn => turn.sourceRefs?.length
      ? [turn.question, turn.answer, turn.sourceUrls ?? [], turn.sourceRefs]
      : [turn.question, turn.answer, turn.sourceUrls ?? []]),
  ])).digest('hex');
}
