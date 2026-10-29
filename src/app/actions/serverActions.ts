"use server";

// Server-action wrappers around heavy query helpers so that client components can call them safely.
// Only tiny re-exports here – all logic lives in src/server/utils/queries/**

import {
  addArtistData as addArtistDataQuery,
  AddArtistDataResp,
  AddArtistResp,
} from "@/server/utils/queries/artistQueries";

import type { LeaderboardEntry } from "@/server/utils/queries/leaderboardTypes";

// ---- Types re-exported for client files ----
export type { AddArtistDataResp, AddArtistResp, LeaderboardEntry };

// ---- Wrapped functions (actions) ----
export async function addArtistDataAction(url: string, artist: Parameters<typeof addArtistDataQuery>[1]) {
  return addArtistDataQuery(url, artist);
}
