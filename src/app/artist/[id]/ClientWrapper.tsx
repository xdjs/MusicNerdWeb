"use client";

import { useAuth } from "@/app/_components/AuthContext";
import { AuthenticatedOnly } from "@/app/_components/AuthGuard";
import { ReactNode } from "react";

interface ClientWrapperProps {
  children: ReactNode;
  unauthenticatedView?: ReactNode;
}

export default function ClientWrapper({ children, unauthenticatedView }: ClientWrapperProps) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center gap-4">
        <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col items-center gap-4">
          <img className="h-12" src="/spinner.svg" alt="Loading" />
          <div className="text-xl text-black">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AuthenticatedOnly fallback={unauthenticatedView}>
        {children}
      </AuthenticatedOnly>
    </>
  );
}
