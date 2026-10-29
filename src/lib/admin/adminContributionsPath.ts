import { firstParam, type SearchParams } from '@/lib/admin/firstParam';
import { withQuery } from '@/lib/musicNerdApi/withQuery';

/**
 * The `GET /api/admin/contributions` path for the contributions page's search
 * parameters. Pending contributions by default; every status for one contributor.
 *
 * @param params - The contributions page's search parameters.
 * @returns The API path with its query string.
 */
export function adminContributionsPath(params: SearchParams): string {
  const userId = firstParam(params.userId);
  return withQuery('/api/admin/contributions', {
    userId,
    query: firstParam(params.query),
    origin: firstParam(params.origin),
    type: firstParam(params.type),
    status: firstParam(params.status) || (userId ? 'all' : 'pending'),
    page: firstParam(params.page),
  });
}
