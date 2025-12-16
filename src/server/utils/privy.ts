import { PrivyClient } from '@privy-io/server-auth';
import { PRIVY_APP_ID, PRIVY_APP_SECRET } from '@/env';

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
  try {
    const verifiedClaims = await privyClient.verifyAuthToken(authToken);

    // Get full user details
    const user = await privyClient.getUser(verifiedClaims.userId);

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
