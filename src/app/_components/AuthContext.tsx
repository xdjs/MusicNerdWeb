"use client";

import { createContext, useContext, ReactNode } from "react";
import { useAuthState, AuthState } from "@/hooks/useAuthState";

interface AuthContextType extends AuthState {
  // Add any additional auth-related methods here
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const authState = useAuthState();

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
