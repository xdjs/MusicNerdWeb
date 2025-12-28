'use client';

import { usePrivy, useLogin } from '@privy-io/react-auth';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { LegacyAccountModal } from './LegacyAccountModal';

export default function Login({ buttonStyles }: { buttonStyles?: string }) {
  const { ready, authenticated, logout: privyLogout, getAccessToken } = usePrivy();
  const { data: session, status } = useSession();
  const [showLegacyModal, setShowLegacyModal] = useState(false);
  const [hasShownModal, setHasShownModal] = useState(false);
  const [hasPendingUGC, setHasPendingUGC] = useState(false);

  const { login } = useLogin({
    onComplete: async () => {
      try {
        const authToken = await getAccessToken();
        if (authToken) {
          await signIn('privy', {
            authToken,
            redirect: false,
          });
        }
      } catch (error) {
        console.error('[Login] Error signing in with NextAuth:', error);
      }
    },
    onError: (error) => {
      console.error('[Login] Privy login error:', error);
    },
  });

  // Show legacy account modal for users without linked wallet (once per session)
  useEffect(() => {
    if (
      session?.user?.needsLegacyLink &&
      !hasShownModal &&
      status === 'authenticated'
    ) {
      // Small delay to let the UI settle
      const timer = setTimeout(() => {
        setShowLegacyModal(true);
        setHasShownModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [session?.user?.needsLegacyLink, hasShownModal, status]);

  // Fetch pending UGC count for admin badge
  useEffect(() => {
    const fetchPendingUGC = async () => {
      if (session?.user?.isAdmin) {
        try {
          const res = await fetch('/api/pendingUGCCount');
          if (res.ok) {
            const data = await res.json();
            setHasPendingUGC(data.count > 0);
          }
        } catch (err) {
          console.error('[Login] Error fetching pending UGC count:', err);
        }
      }
    };

    fetchPendingUGC();

    // Poll every 30 seconds for admins
    if (session?.user?.isAdmin) {
      const interval = setInterval(fetchPendingUGC, 30000);
      return () => clearInterval(interval);
    }
  }, [session?.user?.isAdmin]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    await privyLogout();
  };

  // Loading state
  if (!ready || status === 'loading') {
    return (
      <Button disabled className={buttonStyles} variant="outline">
        ...
      </Button>
    );
  }

  // Authenticated state
  if (status === 'authenticated' && session?.user) {
    const displayName = session.user.email ||
      (session.user.walletAddress
        ? `${session.user.walletAddress.slice(0, 6)}...${session.user.walletAddress.slice(-4)}`
        : 'Account');

    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={buttonStyles}>
              {displayName}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer">
                Profile
              </Link>
            </DropdownMenuItem>
            {session.user.isAdmin && (
              <DropdownMenuItem asChild>
                <Link href="/admin" className="flex items-center gap-2 cursor-pointer">
                  <span>Admin Panel</span>
                  {hasPendingUGC && (
                    <span className="inline-block h-2 w-2 rounded-full bg-red-600" />
                  )}
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <LegacyAccountModal
          open={showLegacyModal}
          onClose={() => setShowLegacyModal(false)}
        />
      </>
    );
  }

  // Unauthenticated state
  return (
    <Button
      onClick={login}
      className={`bg-[#E91E8C] hover:bg-[#C4177A] text-white ${buttonStyles || ''}`}
    >
      Log In
    </Button>
  );
}
