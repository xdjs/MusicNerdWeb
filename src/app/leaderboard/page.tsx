import { getServerAuthSession } from "@/server/auth";
import Dashboard from "@/app/profile/Dashboard";
import Leaderboard from "@/app/profile/Leaderboard";

// import { notFound } from "next/navigation";
import { getUserById } from "@/server/utils/queries/userQueries";

export default async function Page() {
  const session = await getServerAuthSession();
  const walletlessEnabled = process.env.NEXT_PUBLIC_DISABLE_WALLET_REQUIREMENT === 'true' && process.env.NODE_ENV !== 'production';

  if (walletlessEnabled) {
    const mockUser = {
      id: '00000000-0000-0000-0000-000000000000',
      wallet: '0x0000000000000000000000000000000000000000',
      email: null,
      username: 'Guest User',
      isAdmin: false,
      isWhiteListed: true,
      isSuperAdmin: false,
      isHidden: false,
      acceptedUgcCount: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      legacyId: null,
    } as const;
    return (
        <main className="px-5 sm:px-10 py-10">
            {/* Compact dashboard bar prompting guest users to log in */}
            <Dashboard user={mockUser} allowEditUsername={false} showLeaderboard={false} showDateRange={false} hideLogin={true} showStatus={false} />
            <LeaderboardAutoRefresh />
            <Leaderboard />
        </main>
    ); // show leaderboard only for guest
  }

  if (!session) {
    const guestUser = {
      id: '00000000-0000-0000-0000-000000000000',
      wallet: '0x0000000000000000000000000000000000000000',
      email: null,
      username: 'Guest User',
      isAdmin: false,
      isWhiteListed: false,
      isSuperAdmin: false,
      isHidden: false,
      acceptedUgcCount: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      legacyId: null,
    } as const;
    return (
        <main className="px-5 sm:px-10 py-10">
            {/* Compact dashboard bar prompting guest users to log in */}
            <Dashboard user={guestUser} allowEditUsername={false} showLeaderboard={false} showDateRange={false} hideLogin={true} showStatus={false} />
            <LeaderboardAutoRefresh />
            <Leaderboard />
        </main>
    ); // leaderboard for guest
  }

  let user: Awaited<ReturnType<typeof getUserById>> | null = null;
  try {
    user = await getUserById(session.user.id);
  } catch (e) {
    console.error('[Leaderboard page] Failed to fetch user by id, falling back to guest view', e);
  }
  if (!user) {
    const guestUser = {
      id: '00000000-0000-0000-0000-000000000000',
      wallet: '0x0000000000000000000000000000000000000000',
      email: null,
      username: 'Guest User',
      isAdmin: false,
      isWhiteListed: false,
      isSuperAdmin: false,
      isHidden: false,
      acceptedUgcCount: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      legacyId: null,
    } as const;
    return (
      <main className="px-5 sm:px-10 py-10">
        <Dashboard user={guestUser} allowEditUsername={false} showLeaderboard={false} showDateRange={false} hideLogin={true} showStatus={false} />
        <LeaderboardAutoRefresh />
        <Leaderboard />
      </main>
    );
  }
  return <Dashboard user={user} allowEditUsername={false} showDateRange={false} hideLogin={true} showStatus={false} />;
} 