import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';

interface SessionSyncState {
  lastAutoRefresh: Date | null;
}

export function useSessionSync() {
  const { data: session, update } = useSession();
  const [state, setState] = useState<SessionSyncState>({
    lastAutoRefresh: null,
  });

  // Internal auto-refresh function
  const autoRefreshSession = useCallback(async () => {
    if (!session) return;

    try {
      // Trigger NextAuth session update which will call our JWT callback
      await update();
      setState(prev => ({ ...prev, lastAutoRefresh: new Date() }));
      console.debug('[SessionSync] Auto-refresh completed');
    } catch (error) {
      console.error('[SessionSync] Auto-refresh error:', error);
    }
  }, [session, update]);

  // Auto-refresh when roles might have changed - every 5 minutes when user is active
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        autoRefreshSession();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [session, autoRefreshSession]);

  // Refresh when tab becomes visible (user returns to app)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session) {
        // Check if it's been more than 2 minutes since last refresh
        if (!state.lastAutoRefresh || Date.now() - state.lastAutoRefresh.getTime() > 2 * 60 * 1000) {
          autoRefreshSession();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session, state.lastAutoRefresh, autoRefreshSession]);

  return {
    session,
    lastAutoRefresh: state.lastAutoRefresh,
  };
}
