"use server";

// Server-action wrappers around heavy query helpers so that client components can call them safely.
// Only tiny re-exports here – all logic lives in src/server/utils/queries/**

import { getServerAuthSession } from "@/server/auth";
import { getUserById } from "@/server/utils/queries/userQueries";
import {
  approveUgcAdmin as approveUgcAdminQuery,
  addArtistData as addArtistDataQuery,
  AddArtistDataResp,
  AddArtistResp,
} from "@/server/utils/queries/artistQueries";

import {
  searchForUsersByWallet as searchForUsersByWalletQuery,
  addUsersToWhitelist as addUsersToWhitelistQuery,
  removeFromWhitelist as removeFromWhitelistQuery,
  addUsersToAdmin as addUsersToAdminQuery,
  removeFromAdmin as removeFromAdminQuery,
  addUsersToHidden as addUsersToHiddenQuery,
  removeFromHidden as removeFromHiddenQuery,
} from "@/server/utils/queries/userQueries";

import {
  getUgcStatsInRange as getUgcStatsInRangeQuery,
  LeaderboardEntry,
} from "@/server/utils/queries/leaderboardQueries";

// ---- Types re-exported for client files ----
export type { AddArtistDataResp, AddArtistResp, LeaderboardEntry };

// ---- Auth helper for admin-only actions ----
async function requireAdmin(): Promise<{ authorized: true; userId: string } | { authorized: false; error: string }> {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return { authorized: false, error: "Not authenticated" };
  }
  const user = await getUserById(session.user.id);
  if (!user?.isAdmin) {
    return { authorized: false, error: "Admin access required" };
  }
  return { authorized: true, userId: session.user.id };
}

// ---- Wrapped functions (actions) ----
export async function approveUgcAdminAction(ugcIds: string[]) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    throw new Error(auth.error);
  }
  return approveUgcAdminQuery(ugcIds);
}

export async function addArtistDataAction(url: string, artist: Parameters<typeof addArtistDataQuery>[1]) {
  // addArtistData checks whitelist permission internally
  return addArtistDataQuery(url, artist);
}

export async function searchForUsersByWalletAction(wallet: string) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    throw new Error(auth.error);
  }
  return searchForUsersByWalletQuery(wallet);
}

export async function addUsersToWhitelistAction(wallets: string[]) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    throw new Error(auth.error);
  }
  return addUsersToWhitelistQuery(wallets);
}

export async function removeFromWhitelistAction(userIds: string[]) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    throw new Error(auth.error);
  }
  return removeFromWhitelistQuery(userIds);
}

export async function addUsersToAdminAction(wallets: string[]) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    throw new Error(auth.error);
  }
  return addUsersToAdminQuery(wallets);
}

export async function removeFromAdminAction(userIds: string[]) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    throw new Error(auth.error);
  }
  return removeFromAdminQuery(userIds);
}

export async function getUgcStatsInRangeAction(
  date: Parameters<typeof getUgcStatsInRangeQuery>[0],
  wallet: string | null = null,
) {
  // Leaderboard stats are publicly accessible
  return getUgcStatsInRangeQuery(date, wallet);
}

export async function addUsersToHiddenAction(wallets: string[]) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    throw new Error(auth.error);
  }
  return addUsersToHiddenQuery(wallets);
}

export async function removeFromHiddenAction(userIds: string[]) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    throw new Error(auth.error);
  }
  return removeFromHiddenQuery(userIds);
} 