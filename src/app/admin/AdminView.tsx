"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMusicNerdUser } from "@/hooks/useMusicNerdUser";
import { useAdminQuery } from "@/hooks/useAdminQuery";
import { flattenFilters } from "@/lib/admin/flattenFilters";
import type { AdminClaim, AdminUser, ArtistActivityPage, McpKey, PagedResponse, ReviewQueue } from "@/lib/admin/adminReadTypes";
import AdminDashboard from "./AdminDashboard";
import ArtistActivitySection from "./ArtistActivitySection";

/** The admin dashboard, read from MusicNerdAPI with the signed-in admin's token. Everyone else goes home. */
export default function AdminView({ initialSection, reviewPath, activityPath }: {
  initialSection: "lore" | "activity" | "users"; reviewPath: string; activityPath: string;
}) {
  const router = useRouter();
  const { user, status } = useMusicNerdUser();
  const isAdmin = !!user?.isAdmin;
  useEffect(() => { if (status !== "loading" && !isAdmin) router.replace("/"); }, [status, isAdmin, router]);
  const reviews = useAdminQuery<PagedResponse<ReviewQueue, 'type' | 'query'>>(reviewPath, isAdmin);
  const activity = useAdminQuery<PagedResponse<ArtistActivityPage, 'query' | 'action' | 'eventId'>>(activityPath, isAdmin);
  const users = useAdminQuery<{ users: AdminUser[] }>("/api/admin/users", isAdmin);
  const claims = useAdminQuery<{ claims: AdminClaim[] }>("/api/admin/claims", isAdmin);
  const mcpKeys = useAdminQuery<McpKey[]>("/api/admin/mcp-keys", isAdmin);
  const reads = [reviews, activity, users, claims, mcpKeys];

  const frame = (message: React.ReactNode) => <section className="mx-auto w-full max-w-6xl px-5 py-16 text-sm text-muted-foreground sm:px-10">{message}</section>;
  if (reads.some(read => read.isError && !read.data)) return frame(<p role="alert">Could not load the admin dashboard. Reload to try again.</p>);
  if (!isAdmin || !reviews.data || !activity.data || !users.data || !claims.data || !mcpKeys.data) return frame(<p role="status">Loading the admin dashboard…</p>);

  return <AdminDashboard
    reviews={flattenFilters(reviews.data)}
    activityContent={<ArtistActivitySection data={flattenFilters(activity.data)} />}
    allUsers={users.data.users}
    mcpKeys={mcpKeys.data}
    allClaims={claims.data.claims.map(claim => ({ ...claim, artistName: claim.artistName ?? "Unknown Artist" }))}
    initialSection={initialSection}
  />;
}
