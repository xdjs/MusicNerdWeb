"use server";

// Server-action wrappers around heavy query helpers so that client components can call them safely.
// Only tiny re-exports here – all logic lives in src/server/utils/queries/**

import type { LeaderboardEntry } from "@/server/utils/queries/leaderboardTypes";

// ---- Types re-exported for client files ----
export type { LeaderboardEntry };

// ---- Wrapped functions (actions) ----
