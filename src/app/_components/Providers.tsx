"use client";

import { SessionProvider } from "next-auth/react";
import { Session } from "next-auth";
import AuthToast from "./AuthToast";
import { ThemeProvider } from "./ThemeProvider";
import AutoRefresh from "./AutoRefresh";

export default function Providers({
  children,
  session
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <ThemeProvider defaultTheme="light" storageKey="musicnerd-theme">
      <SessionProvider 
        session={session}
        refetchInterval={5 * 60} // Refresh session every 5 minutes
        refetchOnWindowFocus={true} // Refresh when window gains focus
        refetchWhenOffline={false} // Don't refetch when offline
      >
        <AutoRefresh />
        <AuthToast />
        {children}
      </SessionProvider>
    </ThemeProvider>
  );
} 