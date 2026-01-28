"use client";

import { SessionProvider } from "next-auth/react";
import { Session } from "next-auth";
import { ThemeProvider } from "./ThemeProvider";
import { PrivyProviderWrapper } from "./PrivyProviderWrapper";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function Providers({
  children,
  session
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  return (
    <PrivyProviderWrapper>
      <ThemeProvider storageKey="musicnerd-theme">
        <SessionProvider
          session={session}
          refetchInterval={0}
          refetchOnWindowFocus={false}
        >
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </SessionProvider>
      </ThemeProvider>
    </PrivyProviderWrapper>
  );
}
