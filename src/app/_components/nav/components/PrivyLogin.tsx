'use client';

import { usePrivy, useLogin, useLogout } from '@privy-io/react-auth';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useEffect, useState, useCallback, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LegacyAccountModal } from './LegacyAccountModal';

interface PrivyLoginProps {
  buttonStyles?: string;
}

const PrivyLogin = forwardRef<HTMLButtonElement, PrivyLoginProps>(
  ({ buttonStyles = '' }, ref) => {
    const { ready, authenticated, user: privyUser, getAccessToken } = usePrivy();
    const { data: session, status } = useSession();
    const { toast } = useToast();
    const [showLegacyModal, setShowLegacyModal] = useState(false);
    const [hasShownModal, setHasShownModal] = useState(false);
    const [hasPendingUGC, setHasPendingUGC] = useState(false);
    const [ugcCount, setUgcCount] = useState<number>(0);
    const [hasNewUGC, setHasNewUGC] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [pendingNextAuthLogin, setPendingNextAuthLogin] = useState(false);

    const { login } = useLogin({
      onComplete: async () => {
        // Set flag to trigger NextAuth login once Privy state is ready
        setIsLoggingIn(true);
        setPendingNextAuthLogin(true);
      },
      onError: (error) => {
        console.error('[PrivyLogin] Privy login error:', error);
        setIsLoggingIn(false);
        setPendingNextAuthLogin(false);
      },
    });

    // Handle NextAuth login after Privy authentication is complete
    useEffect(() => {
      const completeLogin = async () => {
        if (!pendingNextAuthLogin || !authenticated || !ready) return;

        try {
          // Get the auth token from Privy (now that we're authenticated)
          const authToken = await getAccessToken();
          if (!authToken) {
            console.error('[PrivyLogin] Failed to get auth token');
            toast({
              title: 'Login Error',
              description: 'Failed to get authentication token. Please try again.',
              variant: 'destructive',
            });
            return;
          }

          // Sign in with NextAuth using the Privy provider
          const result = await signIn('privy', {
            authToken,
            redirect: false,
          });

          if (result?.error) {
            console.error('[PrivyLogin] NextAuth sign in failed:', result.error);
            toast({
              title: 'Login Error',
              description: 'Failed to complete login. Please try again.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Welcome!',
              description: 'You have successfully logged in.',
            });
          }
        } catch (error) {
          console.error('[PrivyLogin] Login error:', error);
          toast({
            title: 'Login Error',
            description: 'An unexpected error occurred. Please try again.',
            variant: 'destructive',
          });
        } finally {
          setIsLoggingIn(false);
          setPendingNextAuthLogin(false);
        }
      };

      completeLogin();
    }, [pendingNextAuthLogin, authenticated, ready, getAccessToken, toast]);

    const { logout: privyLogout } = useLogout({
      onSuccess: () => {
        console.debug('[PrivyLogin] Privy logout complete');
      },
    });

    // Show legacy account modal for new users (once per session)
    useEffect(() => {
      if (
        session?.user?.needsLegacyLink &&
        !hasShownModal &&
        status === 'authenticated'
      ) {
        setShowLegacyModal(true);
        setHasShownModal(true);
      }
    }, [session?.user?.needsLegacyLink, hasShownModal, status]);

    // Fetch pending UGC count for admins
    const fetchPendingUGC = useCallback(async () => {
      if (session?.user?.isAdmin) {
        try {
          const res = await fetch('/api/pendingUGCCount');
          if (res.ok) {
            const data = await res.json();
            setHasPendingUGC(data.count > 0);
          }
        } catch (e) {
          console.error('[PrivyLogin] Error fetching pending UGC count', e);
        }
      } else {
        setHasPendingUGC(false);
      }
    }, [session]);

    // Fetch UGC count for current user
    const fetchUGCCount = useCallback(async () => {
      if (!session) return;

      try {
        const res = await fetch('/api/ugcCount');
        if (res.ok) {
          const data = await res.json();
          setUgcCount(data.count);

          if (typeof window !== 'undefined') {
            const storageKey = `ugcCount_${session.user.id}`;
            const stored = Number(localStorage.getItem(storageKey) || '0');
            setHasNewUGC(data.count > stored);
          }
        }
      } catch (e) {
        console.error('[PrivyLogin] Error fetching UGC count', e);
      }
    }, [session]);

    useEffect(() => {
      fetchUGCCount();
    }, [fetchUGCCount, session]);

    useEffect(() => {
      window.addEventListener('ugcCountUpdated', fetchUGCCount);
      return () => window.removeEventListener('ugcCountUpdated', fetchUGCCount);
    }, [fetchUGCCount]);

    useEffect(() => {
      window.addEventListener('pendingUGCUpdated', fetchPendingUGC);
      fetchPendingUGC();
      const interval = setInterval(fetchPendingUGC, 30000);

      return () => {
        window.removeEventListener('pendingUGCUpdated', fetchPendingUGC);
        clearInterval(interval);
      };
    }, [fetchPendingUGC]);

    const handleLogout = async () => {
      try {
        await signOut({ redirect: false });
        await privyLogout();
        toast({
          title: 'Logged Out',
          description: 'You have been logged out successfully.',
        });
        window.location.reload();
      } catch (error) {
        console.error('[PrivyLogin] Logout error:', error);
        toast({
          title: 'Error',
          description: 'Failed to log out. Please try again.',
          variant: 'destructive',
        });
      }
    };

    // Loading state
    if (!ready || isLoggingIn) {
      return (
        <Button
          className="bg-pastypink animate-pulse w-12 h-12 px-0"
          size="lg"
          type="button"
          disabled
        >
          <img className="max-h-6" src="/spinner.svg" alt="Loading..." />
        </Button>
      );
    }

    // Not authenticated - show login dropdown
    if (status !== 'authenticated' || !session) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              ref={ref}
              id="login-btn"
              size="lg"
              type="button"
              className={`hover:bg-gray-200 transition-colors duration-300 text-white px-0 w-12 h-12 bg-pastypink ${buttonStyles}`}
              onClick={() => login()}
            >
              <Mail color="white" size={20} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem asChild>
              <Link href="/leaderboard" prefetch>
                Leaderboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/profile" prefetch>
                User Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => login()}>Log In</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    // Authenticated - show user dropdown
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              ref={ref}
              type="button"
              size="lg"
              className="relative bg-pastypink hover:bg-pastypink/80 transition-colors duration-300 w-12 h-12 p-0 flex items-center justify-center"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden">
                <img
                  src="/default_pfp_pink.png"
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              {(hasPendingUGC || hasNewUGC) && (
                <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-red-600 border-2 border-white" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem asChild>
              <Link href="/leaderboard" prefetch>
                Leaderboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2" asChild>
              <Link
                href="/profile"
                prefetch
                onClick={() => {
                  try {
                    if (session && typeof window !== 'undefined') {
                      const storageKey = `ugcCount_${session.user.id}`;
                      localStorage.setItem(storageKey, String(ugcCount));
                      setHasNewUGC(false);
                      window.dispatchEvent(new Event('ugcCountUpdated'));
                    }
                  } catch {}
                }}
              >
                <span>User Profile</span>
                {hasNewUGC && (
                  <span className="inline-block h-2 w-2 rounded-full bg-red-600" />
                )}
              </Link>
            </DropdownMenuItem>
            {session?.user?.isAdmin && (
              <DropdownMenuItem asChild className="flex items-center gap-2">
                <Link href="/admin" prefetch>
                  <span>Admin Panel</span>
                  {hasPendingUGC && (
                    <span className="inline-block h-2 w-2 rounded-full bg-red-600" />
                  )}
                </Link>
              </DropdownMenuItem>
            )}
            {session?.user?.needsLegacyLink && (
              <DropdownMenuItem onSelect={() => setShowLegacyModal(true)}>
                Link Wallet
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                handleLogout();
              }}
            >
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
);

PrivyLogin.displayName = 'PrivyLogin';

export default PrivyLogin;
