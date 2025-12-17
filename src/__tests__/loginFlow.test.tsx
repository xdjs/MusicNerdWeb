// @ts-nocheck

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from '@/app/_components/nav/components/Login';

// Helpers to control auth status inside the mocked hook
let authStatus: 'loading' | 'authenticated' | 'unauthenticated' = 'loading';
let sessionData: any = null;

// -------------------- Mocks --------------------
jest.mock('next-auth/react', () => ({
    useSession: jest.fn(() => ({ data: sessionData, status: authStatus })),
    signOut: jest.fn(),
    signIn: jest.fn(),
}));

// Mock Privy hooks
const loginMock = jest.fn();
jest.mock('@privy-io/react-auth', () => ({
    usePrivy: () => ({
        ready: true,
        authenticated: false,
        user: null,
        getAccessToken: jest.fn().mockResolvedValue('mock-token'),
    }),
    useLogin: () => ({ login: loginMock }),
    useLogout: () => ({ logout: jest.fn() }),
    useLinkAccount: () => ({ linkWallet: jest.fn() }),
}));

// Mock next/navigation router hooks that SearchBar expects
jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
}));

// Mock wagmi hooks
jest.mock('wagmi', () => ({
    useAccount: jest.fn(() => ({ isConnected: false })),
    useDisconnect: jest.fn(() => ({ disconnect: jest.fn() })),
    useConfig: jest.fn().mockReturnValue({}),
}));

// Capture the RainbowKit connect modal opener
const openConnectModalMock = jest.fn();

jest.mock('@rainbow-me/rainbowkit', () => ({
    useConnectModal: () => ({ openConnectModal: openConnectModalMock }),
    // Minimal stub for ConnectButton used inside Login component
    ConnectButton: {
        Custom: ({ children }: { children: (props: any) => React.ReactNode }) =>
            children({
                account: undefined,
                chain: undefined,
                openAccountModal: jest.fn(),
                openChainModal: jest.fn(),
                openConnectModal: jest.fn(),
                authenticationStatus: 'unauthenticated',
                mounted: true,
            }),
    },
}));

// Mock addArtist API action (not relevant here)
jest.mock('@/app/actions/addArtist', () => ({
    addArtist: jest.fn(),
}));

// Mock useEnsAvatar hook
jest.mock('@/hooks/useEnsAvatar', () => ({
    useEnsAvatar: () => ({
        ensAvatar: null,
        jazziconSeed: null,
        address: null,
        loading: false
    })
}));

// Disable the loading page component side-effects
jest.mock('@/app/_components/LoadingPage', () => ({
    __esModule: true,
    default: () => null,
}));

// -------------------- Test --------------------

describe('Login flow – Privy authentication', () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
    });

    beforeEach(() => {
        jest.clearAllMocks();
        sessionStorage.clear();
        authStatus = 'unauthenticated';
        sessionData = null;
    });

    it('renders login button and triggers Privy login on click', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <Login buttonStyles="" />
            </QueryClientProvider>
        );

        // Wait for the component to be fully rendered
        await waitFor(() => {
            expect(screen.getByRole('button')).toBeInTheDocument();
        });

        const loginBtn = screen.getByRole('button');
        fireEvent.click(loginBtn);

        // Verify Privy login was triggered
        await waitFor(() => {
            expect(loginMock).toHaveBeenCalled();
        });
    });
}); 