import { getServerAuthSession } from "@/server/auth";
import { redirect } from "next/navigation";
import { getUserById, getAllUsers } from "@/server/utils/queries/userQueries";
import { getPendingUGC } from "@/server/utils/queries/artistQueries";
import { getAllClaims } from "@/server/utils/queries/dashboardQueries";
import { getAllMcpKeys } from "@/server/utils/queries/mcpKeyQueries";
import AdminDashboard from "./AdminDashboard";
import type { ClaimRow } from "./claims-columns";

export default async function Admin() {
  const session = await getServerAuthSession();

  if (!session) {
    redirect('/');
  }

  const user = await getUserById(session.user.id);
  if (!user?.isAdmin) {
    redirect('/');
  }

  const [pendingUGCData, allUsers, mcpKeys, rawClaims] = await Promise.all([
    getPendingUGC(),
    getAllUsers(),
    getAllMcpKeys(),
    getAllClaims(),
  ]);

  const allClaims: ClaimRow[] = rawClaims.map((claim) => ({
    id: claim.id,
    status: claim.status,
    referenceCode: claim.referenceCode,
    artistName: claim.artist?.name ?? "Unknown Artist",
    artistId: claim.artistId,
    artistInstagram: claim.artist?.instagram ?? null,
    userEmail: claim.user?.email ?? null,
    userName: claim.user?.username ?? null,
    createdAt: claim.createdAt,
  }));

  return <AdminDashboard pendingUGCData={pendingUGCData} allUsers={allUsers} mcpKeys={mcpKeys} allClaims={allClaims} />;
}
