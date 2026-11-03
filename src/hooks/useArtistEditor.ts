"use client";

import { useQuery } from "@tanstack/react-query";
import { requestUserApi } from "@/lib/user/requestUserApi";
import type { ArtistVaultSource } from "@/server/db/DbTypes";

/** `GET /api/artist/{id}/editor`: what the claimant or an admin edits on the page. */
export type ArtistEditor = { bio: string | null; approvedSources: ArtistVaultSource[]; pendingSources: ArtistVaultSource[] };

/**
 * The artist page's editor view from MusicNerdAPI: the About as stored and every
 * approved and pending source with its contributor's name.
 *
 * @param artistId - The artist.
 * @param enabled - True only for the approved claimant or an admin.
 * @returns The editor view, or null until it is read (and for everyone else).
 */
export function useArtistEditor(artistId: string, enabled: boolean): ArtistEditor | null {
  const query = useQuery({
    queryKey: ["artistEditor", artistId],
    queryFn: async ({ signal }) => {
      const response = await requestUserApi(`/api/artist/${artistId}/editor`, { signal });
      if (!response.ok) throw new Error(`Could not load the editor view (${response.status})`);
      const { bio, approvedSources, pendingSources } = await response.json();
      return { bio, approvedSources, pendingSources } as ArtistEditor;
    },
    enabled,
  });
  return enabled ? query.data ?? null : null;
}
