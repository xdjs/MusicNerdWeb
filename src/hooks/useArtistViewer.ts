"use client";

import { useQuery } from "@tanstack/react-query";
import { useMusicNerdUser } from "@/hooks/useMusicNerdUser";
import { requestUserApi } from "@/lib/user/requestUserApi";

/** `GET /api/artist/{id}/viewer`: the signed-in caller's relation to the artist. */
export type ArtistViewer = { claimStatus: "pending" | "approved" | null; addedByCaller: boolean };

/**
 * Who is looking at an artist page: the signed-in account, and from
 * MusicNerdAPI their own claim on the artist and whether they added it.
 * Visitors make no request.
 *
 * @param artistId - The artist.
 * @returns `user` (null for visitors), `claimStatus` and `addedByCaller`.
 */
export function useArtistViewer(artistId: string) {
  const { user } = useMusicNerdUser();
  const query = useQuery({
    queryKey: ["artistViewer", artistId, user?.id ?? null],
    queryFn: async ({ signal }) => {
      const response = await requestUserApi(`/api/artist/${artistId}/viewer`, { signal });
      if (!response.ok) throw new Error(`Could not load your relation to this artist (${response.status})`);
      return (await response.json()) as ArtistViewer;
    },
    enabled: !!user,
  });
  return {
    user,
    claimStatus: user ? query.data?.claimStatus ?? null : null,
    addedByCaller: !!user && !!query.data?.addedByCaller,
  };
}
