import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/server/auth';
import {
  getUserByWallet,
  linkWalletToUser,
  mergeAccounts,
} from '@/server/utils/queries/userQueries';

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();

  if (!session?.user?.id || !session?.user?.privyUserId) {
    return NextResponse.json(
      { success: false, error: 'Not authenticated' },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { walletAddress } = body;

  // Validate wallet address format
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return NextResponse.json(
      { success: false, error: 'Invalid wallet address format' },
      { status: 400 }
    );
  }

  const normalizedWallet = walletAddress.toLowerCase();

  try {
    // Check if this wallet belongs to a legacy user
    const legacyUser = await getUserByWallet(normalizedWallet);

    if (legacyUser) {
      // Check if legacy wallet already linked to another Privy account
      if (legacyUser.privyUserId && legacyUser.privyUserId !== session.user.privyUserId) {
        return NextResponse.json(
          { success: false, error: 'This wallet is already linked to another account' },
          { status: 409 }
        );
      }

      // Check if this is the same user (already linked)
      if (legacyUser.id === session.user.id) {
        return NextResponse.json({
          success: true,
          merged: false,
          message: 'Wallet is already linked to your account.',
        });
      }

      // Perform account merge: legacy user becomes the surviving account
      console.log('[LinkWallet] Merging accounts:', {
        currentUserId: session.user.id,
        legacyUserId: legacyUser.id,
      });

      const mergeResult = await mergeAccounts(
        session.user.id,
        legacyUser.id,
        session.user.privyUserId,
        session.user.email ?? undefined
      );

      if (!mergeResult.success) {
        console.error('[LinkWallet] Merge failed:', mergeResult.error);
        return NextResponse.json(
          { success: false, error: mergeResult.error || 'Account merge failed' },
          { status: 500 }
        );
      }

      console.log('[LinkWallet] Merge successful, merged user ID:', mergeResult.mergedUserId);

      return NextResponse.json({
        success: true,
        merged: true,
        message: 'Account merged successfully! Your contribution history has been restored.',
        mergedUserId: mergeResult.mergedUserId,
      });
    } else {
      // No legacy user - just link the wallet to current user
      console.log('[LinkWallet] Linking wallet to user:', session.user.id);

      const result = await linkWalletToUser(session.user.id, normalizedWallet);

      if (!result) {
        return NextResponse.json(
          { success: false, error: 'Failed to link wallet' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        merged: false,
        message: 'Wallet linked successfully!',
      });
    }
  } catch (error) {
    console.error('[LinkWallet] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
