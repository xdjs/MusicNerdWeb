import { getServerAuthSession } from "@/server/auth";
import { redirect } from "next/navigation";
import { getUserById, getAllUsers } from "@/server/utils/queries/userQueries";
import { getPendingUGC } from "@/server/utils/queries/artistQueries";
import { getPendingClaims } from "@/server/utils/queries/dashboardQueries";
import AdminTabs from "./AdminTabs";
import type { PendingClaimRow } from "./claims-columns";

export default async function Admin() {
  const session = await getServerAuthSession();

  if (!session) {
    redirect('/');
  }

  // Check if user is admin
  const user = await getUserById(session.user.id);
  if (!user?.isAdmin) {
    redirect('/');
  }

  // Fetch data for admin dashboard
  const [pendingUGCData, allUsers, rawClaims] = await Promise.all([
    getPendingUGC(),
    getAllUsers(),
    getPendingClaims(),
  ]);

  // Map claims to table row format
  const pendingClaims: PendingClaimRow[] = rawClaims.map((claim) => ({
    id: claim.id,
    referenceCode: claim.referenceCode,
    artistName: claim.artist?.name ?? "Unknown Artist",
    artistInstagram: claim.artist?.instagram ?? null,
    userEmail: claim.user?.email ?? null,
    userName: claim.user?.username ?? null,
    createdAt: claim.createdAt,
  }));

  return (
    <section className="admin-page px-4 sm:px-10 py-5 space-y-6">
      <h1 className="text-3xl font-bold text-center mb-8">Admin Dashboard</h1>
      <AdminTabs
        pendingUGC={pendingUGCData}
        pendingClaims={pendingClaims}
        allUsers={allUsers || []}
      />
    </section>
  );
}
