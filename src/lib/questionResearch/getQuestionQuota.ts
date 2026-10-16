export type QuestionQuota = {
  code: 'visitor_question_quota' | 'question_planning_quota' | 'saved_evidence_quota' | 'research_quota' | 'unknown_quota';
  resetAt?: string;
};

/** Keep quota identity even if a proxy omits reset metadata. A past reset stays past. */
export function getQuestionQuota(data: unknown, headers?: Headers): QuestionQuota | undefined {
  const body = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const knownCodes = ['visitor_question_quota', 'question_planning_quota', 'saved_evidence_quota', 'research_quota'];
  const code = typeof body.code === 'string' && knownCodes.includes(body.code)
    ? body.code as QuestionQuota['code']
    : headers?.get('X-MusicNerd-Quota') === 'true' ? 'unknown_quota' : undefined;
  if (!code) return undefined;

  // resetAt is authoritative: retryAfterSeconds describes when the response was
  // made, not a new window starting whenever a visitor receives or reopens it.
  const reset = typeof body.resetAt === 'string' ? Date.parse(body.resetAt) : NaN;
  if (Number.isFinite(reset)) return { code, resetAt: new Date(reset).toISOString() };
  const seconds = typeof body.retryAfterSeconds === 'number' ? body.retryAfterSeconds : NaN;
  if (Number.isFinite(seconds) && seconds >= 0 && seconds <= 86400)
    return { code, resetAt: new Date(Date.now() + seconds * 1000).toISOString() };
  const retryAfter = headers?.get('Retry-After');
  if (retryAfter) {
    const numeric = Number(retryAfter);
    const retryAt = Number.isFinite(numeric)
      ? numeric >= 0 && numeric <= 86400 ? Date.now() + numeric * 1000 : NaN
      : Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) return { code, resetAt: new Date(retryAt).toISOString() };
  }
  return { code };
}
