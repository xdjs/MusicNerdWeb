import { PrivyClient } from '@privy-io/server-auth';
import { PRIVY_APP_ID, PRIVY_APP_SECRET } from '@/env';
import { TOKEN_PREFIXES } from './privyConstants';

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
    let user;

    // Check if this is a direct Privy ID (prefixed with 'privyid:')
    // This is used for test users that don't receive tokens - ONLY allowed in development
    if (authToken.startsWith(TOKEN_PREFIXES.PRIVY_ID)) {
      if (!isDev) {
        console.error('[Privy] Direct Privy ID auth not allowed in production');
        return null;
      }

      const privyUserId = authToken.slice(TOKEN_PREFIXES.PRIVY_ID.length);
      console.log('[Privy] Processing direct Privy ID:', privyUserId);

      // Verify user exists by fetching from Privy API
      user = await getPrivyClient().getUser(privyUserId);
      if (!user) {
        console.error('[Privy] User not found for Privy ID:', privyUserId);
        return null;
      }
      // Already in dev-only block, no need to check isDev
      console.log('[Privy] User verified via direct ID, userId:', user.id);
    }
    // Check if this is an identity token (prefixed with 'idtoken:')
    else if (authToken.startsWith(TOKEN_PREFIXES.ID_TOKEN)) {
      const idToken = authToken.slice(TOKEN_PREFIXES.ID_TOKEN.length);
      if (isDev) {
        console.log('[Privy] Processing identity token, length:', idToken.length);
      }

      // Verify identity token and get user
      user = await getPrivyClient().getUser({ idToken });
      if (isDev) {
        console.log('[Privy] Identity token verified, userId:', user.id);
      }
    } else {
      // Standard access token flow
      const verifiedClaims = await getPrivyClient().verifyAuthToken(authToken);
      if (isDev) {
        console.log('[Privy] Token verified, userId:', verifiedClaims.userId);
      }

      // Get full user details
      user = await getPrivyClient().getUser(verifiedClaims.userId);
    }

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

export async function getPrivyUser(privyUserId: string) {
  try {
    return await getPrivyClient().getUser(privyUserId);
  } catch (error) {
    console.error('[Privy] Failed to get user:', error);
    return null;
  }
}
