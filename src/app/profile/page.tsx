import { getServerAuthSession } from "@/server/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Leaderboard from "./Leaderboard";
import UserEntriesTable from "./UserEntriesTable";
import { WalletLinkButton } from "./components/WalletLinkButton";

export default async function Page() {
  const session = await getServerAuthSession();

  if (!session) {
    redirect('/');
  }

  const { user } = session;

  // Determine role display
  const roleDisplay = user.isSuperAdmin
    ? 'Super Admin'
    : user.isAdmin
    ? 'Admin'
    : user.isWhiteListed
    ? 'Contributor'
    : 'User';

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8 text-center">Profile</h1>

      {/* Account Details Card */}
      <Card className="mb-6 border-2 border-[#9b83a0]">
        <CardHeader>
          <CardTitle className="text-[#9b83a0]">Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <span className="font-semibold text-muted-foreground">Email:</span>
            <span>{user.email || 'Not set'}</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <span className="font-semibold text-muted-foreground">Wallet:</span>
            <span className="font-mono text-sm">
              {user.walletAddress
                ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
                : 'Not linked'}
            </span>
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <span className="font-semibold text-muted-foreground">Role:</span>
            <span>{roleDisplay}</span>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Link Card - only show if no wallet linked */}
      {!user.walletAddress && (
        <Card className="mb-6 border-2 border-[#E91E8C]">
          <CardHeader>
            <CardTitle className="text-[#E91E8C]">Link Legacy Account</CardTitle>
            <CardDescription>
              Have an older Music Nerd wallet-based account? Connect your wallet
              to merge accounts and restore your contribution history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WalletLinkButton />
          </CardContent>
        </Card>
      )}

      {/* Leaderboard - highlight current user */}
      <div className="mb-8">
        <Leaderboard highlightIdentifier={user.walletAddress || user.email || undefined} />
      </div>

      {/* User Entries Table */}
      <UserEntriesTable />
    </div>
  );
}
