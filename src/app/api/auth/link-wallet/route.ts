import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/server/auth';
import {
  getUserByWallet,
  linkWalletToUser,
  mergeAccounts
} from '@/server/utils/queries/userQueries';

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();

  if (!session?.user?.id || !session?.user?.privyUserId) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  let walletAddress: string;
  try {
    const body = await request.json();
    walletAddress = body.walletAddress;
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return NextResponse.json(
      { error: 'Invalid wallet address' },
      { status: 400 }
    );
  }

  const normalizedWallet = walletAddress.toLowerCase();

  try {
    // Check if this wallet belongs to a legacy user
    const legacyUser = await getUserByWallet(normalizedWallet);

    if (legacyUser) {
      // Legacy user found - check if already linked to Privy
      if (legacyUser.privyUserId) {
        return NextResponse.json(
          { error: 'This wallet is already linked to another account' },
          { status: 409 }
        );
      }

      // Perform account merge
      const mergeResult = await mergeAccounts(session.user.id, legacyUser.id);

      if (!mergeResult.success) {
        return NextResponse.json(
          { error: mergeResult.error || 'Merge failed' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        merged: true,
        message: 'Account merged successfully! Your contribution history has been restored.',
      });
    } else {
      // No legacy user - just link the wallet to current user
      await linkWalletToUser(session.user.id, normalizedWallet);

      return NextResponse.json({
        success: true,
        merged: false,
        message: 'Wallet linked successfully!',
      });
    }
  } catch (error) {
    console.error('[LinkWallet] Error:', error);
    return NextResponse.json(
      { error: 'Failed to link wallet' },
      { status: 500 }
    );
  }
}
