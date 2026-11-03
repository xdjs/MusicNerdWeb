"use client";

import UserNameSetup from "./user/UserNameSetup";
import { ThemeProvider } from "./ThemeProvider";
import { PrivyProviderWrapper } from "./PrivyProviderWrapper";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProviderWrapper>
      <ThemeProvider storageKey="musicnerd-theme">
        <QueryClientProvider client={queryClient}>
          <UserNameSetup />
          {children}
        </QueryClientProvider>
      </ThemeProvider>
    </PrivyProviderWrapper>
  );
}
