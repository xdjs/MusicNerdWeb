'use client';

import { usePrivy, useLogin, useLogout } from '@privy-io/react-auth';
import { requestAdminApi } from '@/lib/admin/requestAdminApi';
import { useEffect, useState, useCallback, forwardRef } from 'react';
import { trackEvent } from '@/lib/analytics/trackEvent';
import { requestContributions } from '@/lib/contributions/requestContributions';
import { requestUserApi } from '@/lib/user/requestUserApi';
import { takeLoginTrigger } from '@/lib/analytics/takeLoginTrigger';
import { rememberLoginTrigger } from '@/lib/analytics/rememberLoginTrigger';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { Menu, X, LogIn, LogOut, Trophy, UserRound, Music2, ShieldCheck, Wallet, Sun, Moon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/app/_components/ThemeProvider';
import AccountMenuAvatar from './AccountMenuAvatar';
import { LegacyAccountModal } from './LegacyAccountModal';
import { useMusicNerdUser } from '@/hooks/useMusicNerdUser';

interface PrivyLoginProps {
  buttonStyles?: string;
}

const accountMenuItemClass = "min-h-12 cursor-pointer gap-3 rounded-lg px-3 text-sm text-white/85 focus:bg-white/10 focus:text-white [&_svg]:text-white/55";
const accountMenuClass = "profile-account-panel w-72 max-w-[calc(100vw-2rem)] max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto rounded-2xl border-white/15 bg-neutral-950/90 bg-gradient-to-br from-white/[0.08] to-transparent p-2 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur-2xl backdrop-saturate-150 sm:w-64";

const isDev = process.env.NODE_ENV === 'development';
const LEGACY_MODAL_SHOWN_KEY = 'legacyModalShown';

const PrivyLogin = forwardRef<HTMLButtonElement, PrivyLoginProps>(
  ({ buttonStyles = '' }, ref) => {
    const { authenticated } = usePrivy();
    const { user: account, status } = useMusicNerdUser();
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    const [showLegacyModal, setShowLegacyModal] = useState(false);
    const [hasPendingUGC, setHasPendingUGC] = useState(false);
    const [ugcCount, setUgcCount] = useState<number>(0);
    const [hasNewUGC, setHasNewUGC] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [hasDashboardClaim, setHasDashboardClaim] = useState(false);
    const [claimedArtistId, setClaimedArtistId] = useState<string | null>(null);
    // Check for approved claim via API (replaces unreliable localStorage check)
    const accountId = account?.id;
    useEffect(() => {
      if (!accountId) {
        setHasDashboardClaim(false);
        setClaimedArtistId(null);
        return;
      }
      const controller = new AbortController();
      requestUserApi('/api/user/has-claim', { signal: controller.signal })
        .then(r => r.json())
        .then(d => {
          setHasDashboardClaim(!!d.hasClaim);
          setClaimedArtistId(d.artistId ?? null);
        })
        .catch(() => {
          setHasDashboardClaim(false);
          setClaimedArtistId(null);
        });
      return () => controller.abort();
    }, [accountId]);

    // Privy is the session: the account and every API call follow its token.
    const { login } = useLogin({
      onComplete: ({ user, isNewUser, wasAlreadyAuthenticated }) => {
        if (isDev) {
          console.log('[PrivyLogin] onComplete called:', { userId: user?.id, isNewUser, wasAlreadyAuthenticated });
        }
        if (!wasAlreadyAuthenticated) trackEvent('login', { trigger: takeLoginTrigger(), new: Boolean(isNewUser) });
      },
      onError: (error) => {
        console.error('[PrivyLogin] Privy login error:', error);
      },
    });

    const { logout: privyLogout } = useLogout({
      onSuccess: () => {
        if (isDev) {
          console.log('[PrivyLogin] Privy logout complete');
        }
      },
    });

    // Handle login click — if Privy is signed in but the account can't be read,
    // the Privy session is stale. Log out of Privy first, then start fresh.
    const handleLogin = useCallback(async () => {
      if (authenticated && status === 'unauthenticated') {
        if (isDev) {
          console.log('[PrivyLogin] Stale Privy session detected, logging out before fresh login');
        }
        setIsLoggingIn(true);
        try {
          await privyLogout();
        } catch (e) {
          if (isDev) {
            console.log('[PrivyLogin] Privy logout error during reset:', e);
          }
          setIsLoggingIn(false);
          toast({
            title: 'Login Error',
            description: 'Could not reset session. Please refresh the page.',
            variant: 'destructive',
          });
          return;
        }
        setIsLoggingIn(false);
        login();
      } else {
        login();
      }
    }, [authenticated, status, login, privyLogout, toast]);

    // UserNameSetup now owns the first-login welcome. Wallet linking remains
    // available explicitly from the account menu without a second automatic dialog.

    // Fetch pending UGC count for admins
    const isAdmin = !!account?.isAdmin;
    const fetchPendingUGC = useCallback(async () => {
      if (isAdmin) {
        try {
          const res = await requestAdminApi('/api/pendingUGCCount');
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
    }, [isAdmin]);

    // Fetch UGC count for current user
    const fetchUGCCount = useCallback(async () => {
      if (!accountId) return;

      try {
        const res = await requestContributions('/api/ugcCount');
        if (res.ok) {
          const data = await res.json();
          setUgcCount(data.count);

          if (typeof window !== 'undefined') {
            const storageKey = `ugcCount_${accountId}`;
            const stored = Number(localStorage.getItem(storageKey) || '0');
            setHasNewUGC(data.count > stored);
          }
        }
      } catch (e) {
        console.error('[PrivyLogin] Error fetching UGC count', e);
      }
    }, [accountId]);

    useEffect(() => {
      fetchUGCCount();
    }, [fetchUGCCount]);

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
        sessionStorage.removeItem(LEGACY_MODAL_SHOWN_KEY);
        await privyLogout();
        // Start the signed-out page clean, without the previous account's reads.
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

    const themeMenuItem = (
      <DropdownMenuItem className={accountMenuItemClass} onSelect={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
      </DropdownMenuItem>
    );

    // Loading state
    if (status === 'loading' || isLoggingIn) {
      return (
        <Button
          className="button-pink bg-highlightpink animate-pulse w-12 h-12 px-0"
          size="lg"
          type="button"
          disabled
        >
          <img className="max-h-6" src="/spinner.svg" alt="Loading..." />
        </Button>
      );
    }

    // Not authenticated - show login dropdown
    if (status !== 'authenticated' || !account) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              ref={ref}
              id="login-btn"
              size="lg"
              type="button"
              className={`button-pink focus-visible:ring-highlightpink active:bg-highlightpink/70 hover:bg-highlightpink/80 transition-colors duration-300 text-black px-0 w-12 h-12 bg-highlightpink ${buttonStyles}`}
              onClick={event => { if (event.isTrusted) rememberLoginTrigger('nav'); void handleLogin(); }}
            >
              <LogIn size={20} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={10} collisionPadding={12} className={accountMenuClass}>
            <DropdownMenuLabel className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-white/45">Explore</DropdownMenuLabel>
            <DropdownMenuItem className={accountMenuItemClass} asChild>
              <Link href="/leaderboard" prefetch>
                <Trophy aria-hidden="true" />Leaderboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className={accountMenuItemClass} asChild>
              <Link href="/profile" prefetch>
                <UserRound aria-hidden="true" />User Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className={accountMenuItemClass} asChild>
              <Link href="/about"><span aria-hidden="true" className="inline-block h-5 w-5 shrink-0 bg-current opacity-60" style={{ mask: 'url(/music-nerd-shades.png) center / contain no-repeat', WebkitMask: 'url(/music-nerd-shades.png) center / contain no-repeat' }} />About</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="mx-1 my-2 bg-white/10" />
            <DropdownMenuLabel className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/45">Account</DropdownMenuLabel>
            {themeMenuItem}
            <DropdownMenuItem className={accountMenuItemClass} onSelect={handleLogin}><LogIn aria-hidden="true" />Log In</DropdownMenuItem>
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
              aria-label="Account menu"
              type="button"
              size="lg"
              className="relative bg-highlightpink hover:bg-highlightpink/80 transition-colors duration-300 w-12 h-12 rounded-full p-0 flex items-center justify-center"
            >
              <X aria-hidden="true" className="profile-account-close-icon hidden" size={20} />
              <AccountMenuAvatar key={account.id} userId={account.id} />
              {(hasPendingUGC || hasNewUGC) && (
                <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-red-600 border-2 border-white" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={10} collisionPadding={12} className={accountMenuClass}>
            <DropdownMenuLabel className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-white/45">Explore</DropdownMenuLabel>
            <DropdownMenuItem className={accountMenuItemClass} asChild>
              <Link href="/leaderboard" prefetch>
                <Trophy aria-hidden="true" />Leaderboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className={accountMenuItemClass} asChild>
              <Link
                href="/profile"
                prefetch
                onClick={() => {
                  try {
                    if (typeof window !== 'undefined') {
                      const storageKey = `ugcCount_${account.id}`;
                      localStorage.setItem(storageKey, String(ugcCount));
                      setHasNewUGC(false);
                      window.dispatchEvent(new Event('ugcCountUpdated'));
                    }
                  } catch {}
                }}
              >
                <UserRound aria-hidden="true" /><span>User Profile</span>
                {hasNewUGC && (
                  <span className="inline-block h-2 w-2 rounded-full bg-red-600" />
                )}
              </Link>
            </DropdownMenuItem>
            {hasDashboardClaim && claimedArtistId && (
              <DropdownMenuItem className={accountMenuItemClass} asChild>
                <Link href={`/artist/${claimedArtistId}`} prefetch>
                  <Music2 aria-hidden="true" />My Artist Profile
                </Link>
              </DropdownMenuItem>
            )}
            {account.isAdmin && (
              <DropdownMenuItem asChild className={accountMenuItemClass}>
                <Link href="/admin" prefetch>
                  <ShieldCheck aria-hidden="true" /><span>Admin Panel</span>
                  {hasPendingUGC && (
                    <span className="inline-block h-2 w-2 rounded-full bg-red-600" />
                  )}
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem className={accountMenuItemClass} asChild>
              <Link href="/about"><span aria-hidden="true" className="inline-block h-5 w-5 shrink-0 bg-current opacity-60" style={{ mask: 'url(/music-nerd-shades.png) center / contain no-repeat', WebkitMask: 'url(/music-nerd-shades.png) center / contain no-repeat' }} />About</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="mx-1 my-2 bg-white/10" />
            <DropdownMenuLabel className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/45">Account</DropdownMenuLabel>
            {account.needsLegacyLink && (
              <DropdownMenuItem className={accountMenuItemClass} onSelect={() => setShowLegacyModal(true)}>
                <Wallet aria-hidden="true" />Link Wallet
              </DropdownMenuItem>
            )}
            {themeMenuItem}
            <DropdownMenuItem
              className={accountMenuItemClass}
              onSelect={(e) => {
                e.preventDefault();
                handleLogout();
              }}
            >
              <LogOut aria-hidden="true" />Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <LegacyAccountModal
          open={showLegacyModal}
          onClose={() => {
            setShowLegacyModal(false);
            sessionStorage.setItem(LEGACY_MODAL_SHOWN_KEY, 'true');
          }}
        />
      </>
    );
  }
);

PrivyLogin.displayName = 'PrivyLogin';

export default PrivyLogin;
