import { PrivyClient } from '@privy-io/server-auth';

// Singleton pattern for Privy client
let privyClientInstance: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
  if (!privyClientInstance) {
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error('Missing Privy environment variables: NEXT_PUBLIC_PRIVY_APP_ID or PRIVY_APP_SECRET');
    }

    privyClientInstance = new PrivyClient(appId, appSecret);
  }
  return privyClientInstance;
}

export interface PrivyVerificationResult {
  userId: string;
  email?: string;
  linkedWallets: string[];
}

/**
 * Verify a Privy access token and return user information
 */
export async function verifyPrivyToken(
  authToken: string
): Promise<PrivyVerificationResult | null> {
  try {
    const client = getPrivyClient();
    const verifiedClaims = await client.verifyAuthToken(authToken);
    const user = await client.getUser(verifiedClaims.userId);

    const linkedWallets = user.linkedAccounts
      .filter(acc => acc.type === 'wallet')
      .map(acc => {
        // Wallet accounts have an 'address' field
        const walletAcc = acc as { type: 'wallet'; address: string };
        return walletAcc.address.toLowerCase();
      });

    const emailAccount = user.linkedAccounts.find(acc => acc.type === 'email');
    // Email accounts have an 'address' field containing the email
    const email = emailAccount ? (emailAccount as { type: 'email'; address: string }).address : undefined;

    return {
      userId: user.id,
      email,
      linkedWallets,
    };
  } catch (error) {
    console.error('[Privy] Token verification failed:', error);
    return null;
  }
}

/**
 * Get a Privy user by their Privy user ID
 */
export async function getPrivyUser(privyUserId: string) {
  try {
    const client = getPrivyClient();
    return await client.getUser(privyUserId);
  } catch (error) {
    console.error('[Privy] Failed to get user:', error);
    return null;
  }
}
