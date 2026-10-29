import { firstParam, type SearchParams } from '@/lib/admin/firstParam';
import { withQuery } from '@/lib/musicNerdApi/withQuery';

/**
 * The `GET /api/admin/activity` path for the admin page's search parameters.
 *
 * @param params - The admin page's search parameters.
 * @returns The API path with its query string.
 */
export function adminActivityPath(params: SearchParams): string {
  return withQuery('/api/admin/activity', {
    query: firstParam(params.activityQuery),
    action: firstParam(params.activityAction),
    eventId: firstParam(params.activityId),
    page: firstParam(params.activityPage),
  });
}
