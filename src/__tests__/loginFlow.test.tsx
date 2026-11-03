// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('@/app/_components/nav/components/AccountMenuAvatar', () => ({
  __esModule: true, default: () => <img src="/default_pfp_pink.png" alt="Your profile" />,
}));

let mockPrivyReady = true;
let mockPrivyAuthenticated = false;
let mockPrivyUser: any = null;
let mockAccount: any = null;
let mockAccountStatus = 'unauthenticated';
let loginCallbacks: { onComplete?: Function } = {};

const mockPrivyLogin = jest.fn();
const mockPrivyLogout = jest.fn();

jest.mock('@privy-io/react-auth', () => ({
    usePrivy: () => ({
        ready: mockPrivyReady,
        authenticated: mockPrivyAuthenticated,
        user: mockPrivyUser,
        getAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
    }),
    useLogin: (opts: any) => {
        loginCallbacks = opts || {};
        return { login: mockPrivyLogin };
    },
    useLogout: () => ({ logout: mockPrivyLogout }),
}));

jest.mock('@/hooks/useMusicNerdUser', () => ({
    useMusicNerdUser: () => ({ user: mockAccount?.user ?? null, status: mockAccountStatus, isError: false, refetch: jest.fn().mockResolvedValue({}) }),
}));

jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: jest.fn() }),
}));

jest.mock('@/app/_components/nav/components/LegacyAccountModal', () => ({
    LegacyAccountModal: ({ open, onClose }: any) =>
        open ? <div data-testid="legacy-modal"><button onClick={onClose}>Close</button></div> : null,
}));

jest.mock('@/components/ui/button', () => {
    const React = require('react');
    const MockButton = React.forwardRef(({ children, onClick, disabled, ...props }: any, ref: any) => (
        <button ref={ref} onClick={onClick} disabled={disabled} {...props}>{children}</button>
    ));
    MockButton.displayName = 'MockButton';
    return { Button: MockButton };
});

jest.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: ({ children }: any) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
    DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuItem: ({ children, onSelect }: any) => (
        <div role="menuitem" onClick={onSelect}>{children}</div>
    ),
}));

jest.mock('lucide-react', () => ({
    ...jest.requireActual('lucide-react'),
    LogIn: () => <svg data-testid="login-icon" />,
}));

jest.mock('next/link', () => {
    return function MockLink({ children, href, ...props }: any) {
        return <a href={href} {...props}>{children}</a>;
    };
});

import PrivyLogin from '@/app/_components/nav/components/PrivyLogin';

describe('Login flow', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        loginCallbacks = {};
        mockPrivyReady = true;
        mockPrivyAuthenticated = false;
        mockPrivyUser = null;
        mockAccount = null;
        mockAccountStatus = 'unauthenticated';
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ count: 0 }),
        });
        Object.defineProperty(window, 'sessionStorage', {
            value: {
                getItem: jest.fn(() => null),
                setItem: jest.fn(),
                removeItem: jest.fn(),
                clear: jest.fn(),
            },
            writable: true,
        });
    });

    describe('Unauthenticated state', () => {
        it('shows the Log In button', () => {
            render(<PrivyLogin />);
            expect(screen.getByText('Log In')).toBeInTheDocument();
        });

        it('shows a disabled loading button when Privy is not ready', () => {
            mockPrivyReady = false;
            mockAccountStatus = 'loading'; // useMusicNerdUser is loading until Privy is ready
            render(<PrivyLogin />);
            expect(screen.getByRole('button')).toBeDisabled();
        });
    });

    describe('Login trigger', () => {
        it('opens Privy login modal when "Log In" is clicked', () => {
            render(<PrivyLogin />);
            fireEvent.click(screen.getByText('Log In'));
            expect(mockPrivyLogin).toHaveBeenCalled();
        });
    });

    describe('Post-login', () => {
        it('needs no second sign-in after a fresh Privy login', async () => {
            mockPrivyAuthenticated = true;
            mockPrivyUser = { id: 'did:privy:user123' };
            render(<PrivyLogin />);

            await loginCallbacks.onComplete?.({
                user: { id: 'did:privy:user123' },
                isNewUser: false,
                wasAlreadyAuthenticated: false,
            });

            expect(mockPrivyLogin).not.toHaveBeenCalled();
            expect(mockPrivyLogout).not.toHaveBeenCalled();
        });
    });

    describe('Authenticated state', () => {
        beforeEach(() => {
            mockPrivyAuthenticated = true;
            mockAccount = {
                user: { id: 'user-uuid', isAdmin: false, needsLegacyLink: false },
            };
            mockAccountStatus = 'authenticated';
        });

        it('shows the profile avatar (not the login icon)', () => {
            render(<PrivyLogin />);
            expect(screen.getByAltText('Your profile')).toBeInTheDocument();
            expect(screen.queryByTestId('login-icon')).not.toBeInTheDocument();
        });

        it('shows the Log Out option', () => {
            render(<PrivyLogin />);
            expect(screen.getByText('Log Out')).toBeInTheDocument();
        });
    });

    describe('Logout flow', () => {
        beforeEach(() => {
            mockPrivyAuthenticated = true;
            mockAccount = {
                user: { id: 'user-uuid', isAdmin: false, needsLegacyLink: false },
            };
            mockAccountStatus = 'authenticated';
        });

        it('logs out of Privy when Log Out is clicked', async () => {
            render(<PrivyLogin />);
            fireEvent.click(screen.getByText('Log Out'));

            await waitFor(() => {
                expect(mockPrivyLogout).toHaveBeenCalled();
            });
        });
    });
});
