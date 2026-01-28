import { PrivyClient } from '@privy-io/server-auth';
import { PRIVY_APP_ID, PRIVY_APP_SECRET } from '@/env';

// Validate Privy configuration
if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
  console.error('[Privy] Missing configuration:', {
    hasAppId: !!PRIVY_APP_ID,
    hasAppSecret: !!PRIVY_APP_SECRET,
  });
}

console.log('[Privy] Initializing PrivyClient with appId:', PRIVY_APP_ID?.substring(0, 10) + '...');

const privyClient = new PrivyClient(
  PRIVY_APP_ID,
  PRIVY_APP_SECRET
);

export interface PrivyVerificationResult {
  userId: string;
  email?: string;
  linkedAccounts: Array<{
    type: string;
    address?: string;
    email?: string;
  }>;
}

export async function verifyPrivyToken(
  authToken: string
): Promise<PrivyVerificationResult | null> {
  console.log('[Privy] verifyPrivyToken called with token length:', authToken?.length);

  try {
    let user;

    // Check if this is a direct Privy ID (prefixed with 'privyid:')
    // This is used for test users that don't receive tokens
    if (authToken.startsWith('privyid:')) {
      const privyUserId = authToken.slice(8); // Remove 'privyid:' prefix
      console.log('[Privy] Processing direct Privy ID:', privyUserId);

      // Verify user exists by fetching from Privy API
      console.log('[Privy] Calling privyClient.getUser to verify user exists...');
      user = await privyClient.getUser(privyUserId);
      if (!user) {
        console.error('[Privy] User not found for Privy ID:', privyUserId);
        return null;
      }
      console.log('[Privy] User verified via direct ID, userId:', user.id);
    }
    // Check if this is an identity token (prefixed with 'idtoken:')
    else if (authToken.startsWith('idtoken:')) {
      const idToken = authToken.slice(8); // Remove 'idtoken:' prefix
      console.log('[Privy] Processing identity token, length:', idToken.length);

      // Verify identity token and get user
      console.log('[Privy] Calling privyClient.getUser with idToken...');
      user = await privyClient.getUser({ idToken });
      console.log('[Privy] Identity token verified, userId:', user.id);
    } else {
      // Standard access token flow
      console.log('[Privy] Calling privyClient.verifyAuthToken...');
      const verifiedClaims = await privyClient.verifyAuthToken(authToken);
      console.log('[Privy] Token verified, userId:', verifiedClaims.userId);

      // Get full user details
      console.log('[Privy] Fetching full user details...');
      user = await privyClient.getUser(verifiedClaims.userId);
    }

    console.log('[Privy] Got user details:', {
      id: user.id,
      email: user.email?.address,
      linkedAccountsCount: user.linkedAccounts?.length,
    });

    return {
      userId: user.id,
      email: user.email?.address,
      linkedAccounts: user.linkedAccounts.map((account) => ({
        type: account.type,
        address: account.type === 'wallet' ? (account as { address?: string }).address : undefined,
        email: account.type === 'email' ? (account as { address?: string }).address : undefined,
      })),
    };
  } catch (error) {
    console.error('[Privy] Token verification failed:', error);
    console.error('[Privy] Error details:', {
      name: (error as Error)?.name,
      message: (error as Error)?.message,
    });
    return null;
  }
}

export async function getPrivyUser(privyUserId: string) {
  try {
    return await privyClient.getUser(privyUserId);
  } catch (error) {
    console.error('[Privy] Failed to get user:', error);
    return null;
  }
}
