'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { ReactNode } from 'react';

interface PrivyProviderWrapperProps {
  children: ReactNode;
}

export function PrivyProviderWrapper({ children }: PrivyProviderWrapperProps) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
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
