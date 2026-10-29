"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { readAdminApi } from "@/lib/admin/readAdminApi";

/**
 * Read an admin endpoint on MusicNerdAPI. While a new path loads, the previous
 * result stays on screen; `useRefreshAdmin` reads every admin path again.
 *
 * @param path - The API route with its query string.
 * @param enabled - False until the caller is known to be an admin.
 * @returns The react-query result.
 */
export function useAdminQuery<T>(path: string, enabled: boolean) {
  return useQuery({
    queryKey: ["admin", path],
    queryFn: () => readAdminApi<T>(path),
    enabled,
    placeholderData: keepPreviousData,
  });
}
