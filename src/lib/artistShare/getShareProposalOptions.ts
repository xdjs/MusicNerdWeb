/** Explicit layout selection exists only in development and preview deployments. */
export function getShareProposalOptions(params: URLSearchParams, enabled: boolean) {
    const layout = params.get('layout');
    if (!enabled || (layout !== 'editorial' && layout !== 'portrait' && layout !== 'profile' && layout !== 'story' && layout !== 'cover' && layout !== 'sleeve' && layout !== 'dossier' && layout !== 'spotlight' && layout !== 'sequence' && layout !== 'broadcast' && layout !== 'manifesto' && layout !== 'orbit' && layout !== 'checkerboard' && layout !== 'panorama' && layout !== 'monogram' && layout !== 'margin')) return null;
    const requestedCta = params.get('cta');
    const cta = requestedCta === 'read' || requestedCta === 'meet' || requestedCta === 'music' || requestedCta === 'explore' || requestedCta === 'story' ? requestedCta : 'know';
    const palette = params.get('palette') === 'logo' ? 'logo' : params.get('palette') === 'pink' && ['cover', 'sleeve', 'dossier', 'spotlight', 'sequence', 'broadcast', 'manifesto', 'orbit', 'checkerboard', 'panorama', 'monogram', 'margin'].includes(layout) ? 'pink' : 'white';
    return { layout, cta, palette } as const;
}
