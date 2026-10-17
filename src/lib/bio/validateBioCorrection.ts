import { normalizePublicUrl } from '@/lib/links/normalizePublicUrl';

/** Reports are data for human review, never instructions for generation. */
export function validateBioCorrection(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  if (!['wrong_artist', 'incorrect', 'outdated', 'other'].includes(String(input.reason))) return null;
  if (typeof input.expectedBio !== 'string' || !input.expectedBio.trim() || input.expectedBio.length > 12000) return null;
  if (input.details !== undefined && typeof input.details !== 'string') return null;
  if (input.sourceUrl !== undefined && typeof input.sourceUrl !== 'string') return null;
  const details = ((input.details ?? '') as string).trim();
  const rawUrl = ((input.sourceUrl ?? '') as string).trim();
  if (details.length > 2000 || rawUrl.length > 2048) return null;
  const sourceUrl = rawUrl ? normalizePublicUrl(rawUrl) : null;
  if (rawUrl && !sourceUrl) return null;
  if (sourceUrl && (/^\d+\.\d+\.\d+\.\d+$/.test(new URL(sourceUrl).hostname) || /\.(local|internal|localhost)$/i.test(new URL(sourceUrl).hostname))) return null;
  return { reason: input.reason as 'wrong_artist' | 'incorrect' | 'outdated' | 'other', details, sourceUrl, expectedBio: input.expectedBio };
}
