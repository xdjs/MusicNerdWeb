import { normalizePublicUrl } from '@/lib/links/normalizePublicUrl';
import { canonicalizeDestinationUrl } from '@/lib/links/canonicalizeDestinationUrl';

type WebsiteSource = { url: string; type?: string | null; status?: string; podcastEpisodeKey?: string | null };

/** Website ownership alone does not make every page a primary artist destination. */
export function isMainWebsiteSource(source: WebsiteSource, sources: WebsiteSource[] = []): boolean {
  const href = normalizePublicUrl(source.url);
  if (source.type !== 'website' || !href) return false;
  const page = new URL(href);
  const path = page.pathname.replace(/\/+$/, '');
  return !sources.some(candidate => {
    if (candidate.podcastEpisodeKey || candidate.type !== 'website' || (candidate.status && candidate.status !== 'approved')) return false;
    const mainHref = normalizePublicUrl(candidate.url);
    if (!mainHref || canonicalizeDestinationUrl(mainHref) === canonicalizeDestinationUrl(href)) return false;
    const main = new URL(mainHref);
    const mainPath = main.pathname.replace(/\/+$/, '');
    return main.origin === page.origin && !main.search && !main.hash
      && (path.startsWith(`${mainPath}/`) || (path === mainPath && !!(page.search || page.hash)));
  });
}
