import { firstParam, type SearchParams } from '@/lib/admin/firstParam';
import { withQuery } from '@/lib/musicNerdApi/withQuery';

/**
 * The `GET /api/admin/review-queue` path for the admin page's search parameters.
 * The type defaults from the section, and the older `lore*` parameters still work.
 *
 * @param params - The admin page's search parameters.
 * @returns The API path with its query string.
 */
export function adminReviewQueuePath(params: SearchParams): string {
  const section = firstParam(params.section);
  return withQuery('/api/admin/review-queue', {
    type: firstParam(params.reviewType) || (section === 'corrections' ? 'corrections' : section === 'ugc' ? 'links' : 'all'),
    query: firstParam(params.reviewQuery) || firstParam(params.loreQuery),
    page: firstParam(params.reviewPage) || firstParam(params.lorePage),
  });
}
