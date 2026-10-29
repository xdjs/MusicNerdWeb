"use client";

import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { requestUserApi } from "@/lib/user/requestUserApi";

/** The signed-in caller's account, as `GET /api/user/me` returns it. */
export type MusicNerdUser = {
  id: string;
  email: string | null;
  username: string | null;
  usernameNeedsConfirmation: boolean;
  usernamePromptedAt: string | null;
  wallet: string | null;
  privyUserId: string | null;
  createdAt: string;
  updatedAt: string;
  legacyId: string | null;
  isAdmin: boolean;
  isWhiteListed: boolean;
  isSuperAdmin: boolean;
  isHidden: boolean;
  legacyLinkDismissed: boolean;
  acceptedUgcCount: number | null;
  needsLegacyLink: boolean;
};

/**
 * Who is signed in: the caller's Music Nerd account and role flags, read from
 * MusicNerdAPI with their Privy access token. Every component shares one
 * request; `refetch` reads it again after the account changes.
 *
 * @returns `user` (null unless signed in), `status` ("loading" until Privy and
 * the account are known), `isError` and `refetch`.
 */
export function useMusicNerdUser() {
  const { ready, authenticated, user: privyUser } = usePrivy();
  const query = useQuery({
    queryKey: ["musicNerdUser", privyUser?.id ?? null],
    queryFn: async ({ signal }) => {
      const response = await requestUserApi("/api/user/me", { signal });
      if (!response.ok) throw new Error(`Could not load your account (${response.status})`);
      return (await response.json()) as MusicNerdUser;
    },
    enabled: ready && authenticated,
    staleTime: 5 * 60 * 1000,
  });
  const signedIn = ready && authenticated;
  const status = !ready || (signedIn && query.isPending)
    ? "loading"
    : signedIn && query.data ? "authenticated" : "unauthenticated";
  return {
    user: status === "authenticated" ? query.data ?? null : null,
    status,
    isError: query.isError,
    refetch: query.refetch,
  } as const;
}
