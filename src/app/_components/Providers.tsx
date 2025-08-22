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
    <ThemeProvider storageKey="musicnerd-theme">
      <SessionProvider 
        session={session}
        refetchInterval={0} 
        refetchOnWindowFocus={false}
      >
        <AutoRefresh sessionStorageKey="globalSkipReload" showLoading={false} />
        <AuthToast />
        {children}
      </SessionProvider>
    </ThemeProvider>
  );
} 