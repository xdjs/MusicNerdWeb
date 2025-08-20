"use client";

import { ReactNode } from "react";
import { useAuth } from "./AuthContext";

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireWhitelisted?: boolean;
  loadingFallback?: ReactNode;
}

export function AuthGuard({
  children,
  fallback,
  requireAuth = false,
  requireAdmin = false,
  requireWhitelisted = false,
  loadingFallback = <div>Loading...</div>
}: AuthGuardProps) {
  const { isAuthenticated, isLoading, isAdmin, isWhiteListed } = useAuth();

  // Show loading fallback while authentication state is being determined
  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  // Check authentication requirements
  if (requireAuth && !isAuthenticated) {
    return <>{fallback}</>;
  }

  if (requireAdmin && !isAdmin) {
    return <>{fallback}</>;
  }

  if (requireWhitelisted && !isWhiteListed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Convenience components for common auth patterns
export function AuthenticatedOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <AuthGuard requireAuth={true} fallback={fallback}>
      {children}
    </AuthGuard>
  );
}

export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <AuthGuard requireAuth={true} requireAdmin={true} fallback={fallback}>
      {children}
    </AuthGuard>
  );
}

export function WhitelistedOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <AuthGuard requireAuth={true} requireWhitelisted={true} fallback={fallback}>
      {children}
    </AuthGuard>
  );
}

export function UnauthenticatedOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isAuthenticated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
