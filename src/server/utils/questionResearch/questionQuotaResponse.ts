/** Expose only known budget scopes and bounded reset metadata, never raw server errors. */
export function questionQuotaResponse(error: unknown): Response | null {
  if (!error || typeof error !== 'object' || !('code' in error)) return null;
  const messages: Record<string, string> = {
    visitor_question_quota: "You've reached your question limit for this hour.",
    question_planning_quota: "Music Nerd has reached its daily chat allowance.",
    saved_evidence_quota: "Music Nerd has reached its daily saved-source answer limit.",
    research_quota: "New web research has reached its allowance. You can still ask about saved sources.",
  };
  const code = String(error.code);
  if (!Object.hasOwn(messages, code)) return null;
  const value = error as { retryAfterSeconds?: unknown; resetAt?: unknown };
  const seconds = typeof value.retryAfterSeconds === 'number' && Number.isInteger(value.retryAfterSeconds)
    && value.retryAfterSeconds > 0 && value.retryAfterSeconds <= 86400 ? value.retryAfterSeconds : undefined;
  const resetAt = typeof value.resetAt === 'string' && Number.isFinite(Date.parse(value.resetAt))
    ? new Date(value.resetAt).toISOString() : undefined;
  return Response.json({
    code, error: `${messages[code]} ${seconds ? `Try again in ${Math.ceil(seconds / 60)} minute${seconds > 60 ? 's' : ''}.` : 'Please try again later.'}`,
    ...(seconds ? { retryAfterSeconds: seconds, ...(resetAt ? { resetAt } : {}) } : {}),
  }, { status: 429, headers: {
    'Cache-Control': 'private, no-store', 'X-MusicNerd-Quota': 'true',
    ...(seconds ? { 'Retry-After': String(seconds) } : {}),
  } });
}
