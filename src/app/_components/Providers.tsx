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
        refetchInterval={0} // Don't auto-refresh sessions
        refetchOnWindowFocus={false} // Don't refresh when window gains focus
        refetchWhenOffline={false} // Don't refetch when offline
      >
        {/* Temporarily disabled AutoRefresh to test */}
        {/* <AutoRefresh /> */}
        <AuthToast />
        {children}
      </SessionProvider>
    </ThemeProvider>
  );
} 