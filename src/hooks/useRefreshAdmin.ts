"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * After an admin change, read the admin pages' data from MusicNerdAPI again.
 *
 * @returns A function that refetches every `useAdminQuery` result.
 */
export function useRefreshAdmin() {
  const client = useQueryClient();
  return useCallback(() => client.invalidateQueries({ queryKey: ["admin"] }), [client]);
}
