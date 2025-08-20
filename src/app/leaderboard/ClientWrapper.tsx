"use client";

import { Suspense } from "react";
import { getServerAuthSession } from "@/server/auth";
import { getUserByWallet } from "@/server/utils/queries/userQueries";
import Leaderboard from "../profile/Leaderboard";
import PleaseLoginPage from "../_components/PleaseLoginPage";

type User = {
  id: string;
  wallet: string;
  email: string | null;
  username: string | null;
  isAdmin: boolean;
  isWhiteListed: boolean;
  isSuperAdmin: boolean;
  isHidden: boolean;
  acceptedUgcCount: number | null;
  createdAt: string;
  updatedAt: string;
  legacyId: string | null;
};

export default function LeaderboardClientWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LeaderboardPage />
    </Suspense>
  );
}

async function LeaderboardPage() {
  const session = await getServerAuthSession();
  const user = session?.user;

  if (!user) {
    return <PleaseLoginPage text="Log in to view the leaderboard" />;
  }

  // Get the user's wallet address
  const walletAddress = user.walletAddress;
  if (!walletAddress) {
    return <PleaseLoginPage text="No wallet address found" />;
  }

  // Get the full user record from the database
  const userRecord = await getUserByWallet(walletAddress);
  if (!userRecord) {
    return <PleaseLoginPage text="User not found" />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-[#9b83a0]">
          Leaderboard
        </h1>
        <Leaderboard highlightIdentifier={userRecord.username || userRecord.wallet} />
      </div>
    </div>
  );
}
