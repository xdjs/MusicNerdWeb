"use client"
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ReactNode, Suspense, useRef } from "react";
import dynamic from 'next/dynamic';
import { WagmiProvider as WagmiProviderBase, http, createConfig } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { useTheme } from '../../ThemeProvider';

const queryClient = new QueryClient();

// Create a singleton to prevent multiple WalletConnect initializations
let walletConfig: any = null;
let isInitializing = false;

// Dynamically import wallet-related components
const WalletProviders = dynamic(
    async () => {
        const { getDefaultConfig, RainbowKitProvider } = await import('@rainbow-me/rainbowkit');
        const { http } = await import('wagmi');
        const { mainnet: rkMainnet } = await import('wagmi/chains');
        const { RainbowKitSiweNextAuthProvider } = await import('@rainbow-me/rainbowkit-siwe-next-auth');

        const projectId = '929ab7024658ec19d047d5df44fb0f63';

        // Create config only once
        if (!walletConfig && !isInitializing) {
            isInitializing = true;
            console.debug('[WalletProviders] Creating WalletConnect config');
            
            walletConfig = getDefaultConfig({
                appName: 'Music Nerd',
                appDescription: 'Music Nerd platform',
                appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://www.musicnerd.xyz',
                appIcon: 'https://www.musicnerd.xyz/icon.ico',
                projectId,
                chains: [rkMainnet],
                transports: {
                    [rkMainnet.id]: http()
                },
                ssr: true
            });
            
            isInitializing = false;
        }

        return function Providers({ children }: { children: ReactNode }) {
            console.debug('[WalletProviders] Rendering WalletConnect providers');
            
            // Get current theme from ThemeProvider
            const { theme } = useTheme();
            
            return (
                <WagmiProviderBase config={walletConfig}>
                    <QueryClientProvider client={queryClient}>
                        <RainbowKitSiweNextAuthProvider
                            getSiweMessageOptions={() => ({
                                statement: 'Sign in to MusicNerd to add artists and manage your collection.',
                                nonce: undefined,
                                chainId: undefined,
                                domain: window.location.host,
                                uri: window.location.origin,
                                expirationTime: new Date(Date.now() + 1000 * 60 * 5).toISOString(), // 5 minutes from now
                            })}
                            enabled={true}
                        >
                            <RainbowKitProvider
                                modalSize="compact"
                                showRecentTransactions={true}
                                appInfo={{
                                    appName: 'Music Nerd',
                                    learnMoreUrl: 'https://www.musicnerd.xyz',
                                    disclaimer: undefined
                                }}
                                theme={theme === 'dark' ? {
                                    accentColor: '#2ad4fc',
                                    accentColorForeground: '#000000',
                                    actionButtonBackground: '#2ad4fc',
                                    actionButtonBackgroundHover: '#1fb5d4',
                                    actionButtonBorder: 'transparent',
                                    actionButtonBorderHover: 'transparent',
                                    actionButtonSecondaryBackground: '#374151',
                                    actionButtonSecondaryBackgroundHover: '#4b5563',
                                    actionButtonSecondaryBorder: 'transparent',
                                    actionButtonSecondaryBorderHover: 'transparent',
                                    actionButtonSecondaryForeground: '#d1d5db',
                                    borderRadius: 'medium',
                                    boxBackground: '#1f2937',
                                    boxBorder: '#374151',
                                    boxSecondaryBorder: '#4b5563',
                                    closeButton: '#9ca3af',
                                    closeButtonBackground: '#374151',
                                    closeButtonBackgroundHover: '#4b5563',
                                    connectButtonBackground: '#2ad4fc',
                                    connectButtonBackgroundError: '#ef4444',
                                    connectButtonBackgroundHover: '#1fb5d4',
                                    connectButtonBackgroundSuccess: '#10b981',
                                    connectButtonBorder: 'transparent',
                                    connectButtonBorderError: 'transparent',
                                    connectButtonBorderHover: 'transparent',
                                    connectButtonBorderSuccess: 'transparent',
                                    connectButtonForeground: '#000000',
                                    connectButtonForegroundError: '#ffffff',
                                    connectButtonForegroundSuccess: '#ffffff',
                                    connectionIndicator: '#10b981',
                                    downloadBottomCardBackground: '#374151',
                                    downloadTopCardBackground: '#1f2937',
                                    error: '#ef4444',
                                    generalBorder: '#374151',
                                    generalBorderDim: '#4b5563',
                                    menuBackground: '#1f2937',
                                    menuBackgroundHover: '#374151',
                                    menuBorder: '#374151',
                                    menuText: '#d1d5db',
                                    menuTextDim: '#9ca3af',
                                    menuTextSecondary: '#6b7280',
                                    modalBackdrop: 'rgba(0, 0, 0, 0.5)',
                                    modalBackground: '#1f2937',
                                    modalBorder: '#374151',
                                    modalText: '#d1d5db',
                                    modalTextDim: '#9ca3af',
                                    modalTextSecondary: '#6b7280',
                                    profileAction: '#374151',
                                    profileActionBackground: '#1f2937',
                                    profileActionBackgroundHover: '#374151',
                                    profileActionBorder: '#4b5563',
                                    profileActionBorderHover: '#6b7280',
                                    profileActionForeground: '#d1d5db',
                                    profileActionForegroundHover: '#f9fafb',
                                    profileForeground: '#d1d5db',
                                    selectedOptionBorder: '#2ad4fc',
                                    standby: '#f59e0b',
                                } : {
                                    accentColor: '#ef95ff',
                                    accentColorForeground: '#ffffff',
                                    actionButtonBackground: '#ef95ff',
                                    actionButtonBackgroundHover: '#d885e6',
                                    actionButtonBorder: 'transparent',
                                    actionButtonBorderHover: 'transparent',
                                    actionButtonSecondaryBackground: '#f3f4f6',
                                    actionButtonSecondaryBackgroundHover: '#e5e7eb',
                                    actionButtonSecondaryBorder: 'transparent',
                                    actionButtonSecondaryBorderHover: 'transparent',
                                    actionButtonSecondaryForeground: '#374151',
                                    borderRadius: 'medium',
                                    boxBackground: '#ffffff',
                                    boxBorder: '#e5e7eb',
                                    boxSecondaryBorder: '#f3f4f6',
                                    closeButton: '#6b7280',
                                    closeButtonBackground: '#f3f4f6',
                                    closeButtonBackgroundHover: '#e5e7eb',
                                    connectButtonBackground: '#ef95ff',
                                    connectButtonBackgroundError: '#ef4444',
                                    connectButtonBackgroundHover: '#d885e6',
                                    connectButtonBackgroundSuccess: '#10b981',
                                    connectButtonBorder: 'transparent',
                                    connectButtonBorderError: 'transparent',
                                    connectButtonBorderHover: 'transparent',
                                    connectButtonBorderSuccess: 'transparent',
                                    connectButtonForeground: '#ffffff',
                                    connectButtonForegroundError: '#ffffff',
                                    connectButtonForegroundSuccess: '#ffffff',
                                    connectionIndicator: '#10b981',
                                    downloadBottomCardBackground: '#f3f4f6',
                                    downloadTopCardBackground: '#ffffff',
                                    error: '#ef4444',
                                    generalBorder: '#e5e7eb',
                                    generalBorderDim: '#f3f4f6',
                                    menuBackground: '#ffffff',
                                    menuBackgroundHover: '#f3f4f6',
                                    menuBorder: '#e5e7eb',
                                    menuText: '#374151',
                                    menuTextDim: '#6b7280',
                                    menuTextSecondary: '#9ca3af',
                                    modalBackdrop: 'rgba(0, 0, 0, 0.5)',
                                    modalBackground: '#ffffff',
                                    modalBorder: '#e5e7eb',
                                    modalText: '#374151',
                                    modalTextDim: '#6b7280',
                                    modalTextSecondary: '#9ca3af',
                                    profileAction: '#f3f4f6',
                                    profileActionBackground: '#ffffff',
                                    profileActionBackgroundHover: '#f3f4f6',
                                    profileActionBorder: '#e5e7eb',
                                    profileActionBorderHover: '#d1d5db',
                                    profileActionForeground: '#374151',
                                    profileActionForegroundHover: '#111827',
                                    profileForeground: '#374151',
                                    selectedOptionBorder: '#ef95ff',
                                    standby: '#f59e0b',
                                }}
                            >
                                {children}
                            </RainbowKitProvider>
                        </RainbowKitSiweNextAuthProvider>
                    </QueryClientProvider>
                </WagmiProviderBase>
            );
        };
    },
    {
        ssr: false, // This ensures the component only loads on the client side
        loading: () => null // Remove loading message
    }
);

// Minimal Wagmi config for walletless mode (no connectors)
const walletlessConfig = createConfig({
    chains: [mainnet],
    transports: {
        [mainnet.id]: http(),
    },
    ssr: true,
});

function NonWalletContent({ children }: { children: ReactNode }) {
    return (
        <WagmiProviderBase config={walletlessConfig}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProviderBase>
    );
}

export default function LoginProviders({ children }: { children: ReactNode }) {
    const walletlessEnabled = process.env.NEXT_PUBLIC_DISABLE_WALLET_REQUIREMENT === 'true' && process.env.NODE_ENV !== 'production';

    const isWalletRequired = !walletlessEnabled;

    if (!isWalletRequired) {
        return <NonWalletContent>{children}</NonWalletContent>;
    }

    return (
        <Suspense fallback={null}>
            <WalletProviders>{children}</WalletProviders>
        </Suspense>
    );
}