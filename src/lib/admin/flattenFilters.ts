import type { PagedResponse } from '@/lib/admin/adminReadTypes';

/**
 * A paged admin response with its applied `filters` lifted to the top level,
 * the shape the admin pages read. The response's own `status` is dropped, so a
 * `status` filter takes its place.
 *
 * @param body - The response body: `{ status, filters, ...page }`.
 * @returns The page and its filters in one object.
 */
export function flattenFilters<T, K extends keyof T>(body: PagedResponse<T, K>): T {
  const page: Record<string, unknown> = { ...body };
  delete page.status;
  delete page.filters;
  return { ...page, ...body.filters } as T;
}
