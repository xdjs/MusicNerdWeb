"use client";

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from "./ThemeProvider";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { PrivyProviderWrapper } from './PrivyProviderWrapper';
import { useState } from 'react';

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  // Create QueryClient in state to avoid recreation on re-renders
  const [queryClient] = useState(() => new QueryClient());

  return (
    <PrivyProviderWrapper>
      <SessionProvider>
        <ThemeProvider storageKey="musicnerd-theme">
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </ThemeProvider>
      </SessionProvider>
    </PrivyProviderWrapper>
  );
}
