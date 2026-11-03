import { PrivyClient } from '@privy-io/server-auth';
import { PRIVY_APP_ID, PRIVY_APP_SECRET } from '@/env';

// Lazy-initialized Privy client to avoid build-time errors when env vars are missing
let privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
  if (!privyClient) {
    // Validate Privy configuration - fail fast when actually needed
    if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
      const errorMsg = `[Privy] Missing configuration: hasAppId=${!!PRIVY_APP_ID}, hasAppSecret=${!!PRIVY_APP_SECRET}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    privyClient = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);
  }
  return privyClient;
}

export interface PrivyVerificationResult {
  userId: string;
  email?: string;
  linkedAccounts: Array<{
    type: string;
    address?: string;
    email?: string;
  }>;
}

const isDev = process.env.NODE_ENV === 'development';

export async function verifyPrivyToken(
  authToken: string
): Promise<PrivyVerificationResult | null> {
  if (isDev) {
    console.log('[Privy] verifyPrivyToken called with token length:', authToken?.length);
  }

  try {
    const verifiedClaims = await getPrivyClient().verifyAuthToken(authToken);
    if (isDev) {
      console.log('[Privy] Token verified, userId:', verifiedClaims.userId);
    }
    const user = await getPrivyClient().getUser(verifiedClaims.userId);

    if (isDev) {
      console.log('[Privy] Got user details:', {
        id: user.id,
        email: user.email?.address,
        linkedAccountsCount: user.linkedAccounts?.length,
      });
    }

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
