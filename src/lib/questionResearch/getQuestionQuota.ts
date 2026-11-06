export type QuestionQuota = {
  code: 'visitor_question_quota' | 'question_planning_quota' | 'saved_evidence_quota' | 'research_quota';
  resetAt?: string;
};

/** Keep quota identity even if the body omits reset metadata. A past reset stays past. */
export function getQuestionQuota(data: unknown): QuestionQuota | undefined {
  const body = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const knownCodes = ['visitor_question_quota', 'question_planning_quota', 'saved_evidence_quota', 'research_quota'];
  const code = typeof body.code === 'string' && knownCodes.includes(body.code)
    ? body.code as QuestionQuota['code']
    : undefined;
  if (!code) return undefined;

  // resetAt is authoritative: retryAfterSeconds describes when the response was
  // made, not a new window starting whenever a visitor receives or reopens it.
  const reset = typeof body.resetAt === 'string' ? Date.parse(body.resetAt) : NaN;
  if (Number.isFinite(reset)) return { code, resetAt: new Date(reset).toISOString() };
  const seconds = typeof body.retryAfterSeconds === 'number' ? body.retryAfterSeconds : NaN;
  if (Number.isFinite(seconds) && seconds >= 0 && seconds <= 86400)
    return { code, resetAt: new Date(Date.now() + seconds * 1000).toISOString() };
  return { code };
}
