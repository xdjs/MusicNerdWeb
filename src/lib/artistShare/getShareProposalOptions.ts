/** Explicit layout selection exists only in development and preview deployments. */
export function getShareProposalOptions(params: URLSearchParams, enabled: boolean) {
    const layout = params.get('layout');
    if (!enabled || (layout !== 'editorial' && layout !== 'portrait' && layout !== 'profile' && layout !== 'story')) return null;
    const requestedCta = params.get('cta');
    const cta = requestedCta === 'meet' || requestedCta === 'music' || requestedCta === 'explore' || requestedCta === 'story' ? requestedCta : 'know';
    const palette = params.get('palette') === 'logo' ? 'logo' : 'white';
    return { layout, cta, palette } as const;
}
