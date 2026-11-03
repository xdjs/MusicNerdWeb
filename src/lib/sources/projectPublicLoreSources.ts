/** Approved source publication is independent of ownership; original text stays server-side. */
export function projectPublicLoreSources<S extends { status?: string | null; publication?: string | null; trustedAtSubmission?: boolean }>(sources: S[], claimed: boolean) {
  return sources.filter(source => source.status === 'approved' && (
    source.publication === 'public' || ((claimed || source.trustedAtSubmission === true) && (source.publication === 'inherit' || source.publication === undefined))
  )).map(source => ({ ...source, extractedText: null }));
}
