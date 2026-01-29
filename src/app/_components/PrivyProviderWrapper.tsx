'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { ReactNode } from 'react';

interface PrivyProviderWrapperProps {
  children: ReactNode;
}

// Get the app ID, defaulting to empty string if not set
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';

export function PrivyProviderWrapper({ children }: PrivyProviderWrapperProps) {
  // Skip PrivyProvider if app ID is not configured (e.g., during CI build)
  if (!PRIVY_APP_ID) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // Appearance
        appearance: {
          theme: 'dark',
          accentColor: '#E91E8C', // MusicNerd pink
          logo: '/musicNerdLogo.png',
        },
        // Login methods - email only
        loginMethods: ['email'],
        // Embedded wallets configuration - don't auto-create
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'off',
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
