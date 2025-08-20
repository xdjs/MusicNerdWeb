"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Dashboard from "./Dashboard";

type User = {
  id: string;
  wallet: string;
  email: string | null;
  username: string | null;
  isAdmin: boolean;
  isWhiteListed: boolean;
  isSuperAdmin: boolean;
  isHidden: boolean;
  acceptedUgcCount: number | null;
  createdAt: string;
  updatedAt: string;
  legacyId: string | null;
};

export default function ClientWrapper() {
  const { status, data: session } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);


  // Handle authentication state changes and hard refresh
  useEffect(() => {
    console.debug('[Profile] Session state changed:', { status, sessionId: session?.user?.id, isAuthenticated: status === 'authenticated' });
    
    // Check for authentication state transitions that require hard refresh
    const wasLoggedOut = sessionStorage.getItem('wasLoggedOut');
    const postLoginRefresh = sessionStorage.getItem('postLoginRefresh');
    
    if (status === "authenticated" && session?.user?.id && (wasLoggedOut || !postLoginRefresh)) {
      console.debug('[Profile] Detected authentication state change, triggering hard refresh', {
        wasLoggedOut: !!wasLoggedOut,
        postLoginRefresh: !!postLoginRefresh,
        sessionId: session?.user?.id
      });
      
      // Set refresh flag and clear logout flag
      sessionStorage.setItem('postLoginRefresh', 'true');
      sessionStorage.removeItem('wasLoggedOut');
      
      // Force hard refresh
      console.debug('[Profile] Executing hard refresh');
      setTimeout(() => {
        window.location.href = window.location.href;
      }, 100);
      return;
    }
    
    // Additional check for login without wasLoggedOut flag
    if (status === "authenticated" && session?.user?.id && !postLoginRefresh) {
      console.debug('[Profile] Detected fresh login, triggering hard refresh', {
        sessionId: session?.user?.id
      });
      
      // Set refresh flag
      sessionStorage.setItem('postLoginRefresh', 'true');
      
      // Force hard refresh
      console.debug('[Profile] Executing hard refresh for fresh login');
      setTimeout(() => {
        window.location.href = window.location.href;
      }, 100);
      return;
    }
    
    const fetchUser = async () => {
      if (status === "authenticated" && session?.user?.id) {
        try {
          const response = await fetch(`/api/user/${session.user.id}`);
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            // If user fetch fails, treat as guest
            setUser(null);
          }
        } catch (error) {
          console.error('Failed to fetch user:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    if (status !== "loading") {
      fetchUser();
    }
  }, [status, session]); // Remove refreshKey dependency since we're using hard refresh

  // Show loading while determining session
  if (status === "loading" || isLoading) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center gap-4">
        <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col items-center gap-4">
          <img className="h-12" src="/spinner.svg" alt="Loading" />
          <div className="text-xl text-black">Loading...</div>
        </div>
      </div>
    );
  }

  // Guest user object
  const guestUser: User = {
    id: '00000000-0000-0000-0000-000000000000',
    wallet: '0x0000000000000000000000000000000000000000',
    email: null,
    username: 'Guest User',
    isAdmin: false,
    isWhiteListed: false,
    isSuperAdmin: false,
    isHidden: false,
    acceptedUgcCount: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    legacyId: null,
  };

  const currentUser = user || guestUser;

  return (
    <>
      <Dashboard 
        user={currentUser} 
        showLeaderboard={false} 
        showDateRange={false} 
        allowEditUsername={true} 
      />
    </>
  );
}
