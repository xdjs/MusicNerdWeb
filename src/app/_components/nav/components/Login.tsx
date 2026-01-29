"use client"
import { forwardRef } from 'react';
import Link from 'next/link';
import PrivyLogin from './PrivyLogin';

interface LoginProps {
    buttonStyles?: string;
}

// Check if Privy is configured
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';

// Component for non-wallet mode (walletless dev mode)
const isLocalEnvironment = typeof window === 'undefined'
    ? process.env.NODE_ENV !== 'production'
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const NoWalletLogin: React.FC<LoginProps> = ({ buttonStyles }) => {
    // Keep original footprint (w-12 h-12). When local, render admin link inside.
    return (
        <div className="w-12 h-12 flex items-center justify-center">
            {isLocalEnvironment && (
                <Link
                    href="/admin"
                    title="Admin panel"
                    aria-label="Admin panel"
                    className={`flex items-center justify-center w-full h-full bg-pastypink hover:bg-gray-200 transition-colors duration-300 text-white ${buttonStyles}`}
                >
                    Settings
                </Link>
            )}
        </div>
    );
};

// Main component that decides which version to render
const Login = forwardRef<HTMLButtonElement, LoginProps>((props, ref): React.ReactElement => {
    // Walletless mode is only permitted when NODE_ENV !== 'production'
    const walletlessEnabled = process.env.NEXT_PUBLIC_DISABLE_WALLET_REQUIREMENT === 'true' && process.env.NODE_ENV !== 'production';

    // Skip Privy login if not configured (e.g., during CI build)
    if (!PRIVY_APP_ID || walletlessEnabled) {
        return <NoWalletLogin {...props} />;
    }

    // Use Privy-based login (email-first authentication)
    return <PrivyLogin buttonStyles={props.buttonStyles} ref={ref} />;
});

Login.displayName = 'Login';

export default Login;
