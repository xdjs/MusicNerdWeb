import { getServerAuthSession } from "@/server/auth";
import { redirect } from "next/navigation";
import { getUserById, getAllUsers } from "@/server/utils/queries/userQueries";
import { getPendingUGC } from "@/server/utils/queries/artistQueries";
import { getPendingClaims } from "@/server/utils/queries/dashboardQueries";
import { getAllMcpKeys } from "@/server/utils/queries/mcpKeyQueries";
import UGCDataTable from "./ugc-data-table";
import { ugcColumns, whitelistedColumns } from "./columns";
import ClaimsDataTable from "./claims-data-table";
import { claimsColumns } from "./claims-columns";
import type { PendingClaimRow } from "./claims-columns";
import UsersSection from "./UsersSection";
import AdminTabs from "./AdminTabs";
import McpKeysSection from "./McpKeysSection";
import AgentWorkSection from "./AgentWorkSection";
import ArtistDataSection from "./ArtistDataSection";

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
  const [pendingUGCData, allUsers, mcpKeys, rawClaims] = await Promise.all([
    getPendingUGC(),
    getAllUsers(),
    getAllMcpKeys(),
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
        ugcCount={pendingUGCData.length}
        claimsCount={pendingClaims.length}
        ugcContent={
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-[#9b83a0]">
              Pending UGC Submissions ({pendingUGCData.length})
            </h2>
            <UGCDataTable columns={ugcColumns} data={pendingUGCData} />
          </div>
        }
        claimsContent={
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-[#9b83a0]">
              Pending Artist Claims ({pendingClaims.length})
            </h2>
            <ClaimsDataTable columns={claimsColumns} data={pendingClaims} />
          </div>
        }
        usersContent={
          <UsersSection columns={whitelistedColumns} data={allUsers || []} />
        }
        mcpKeysContent={
          <McpKeysSection initialKeys={mcpKeys} />
        }
        agentWorkContent={
          <AgentWorkSection />
        }
        artistDataContent={
          <ArtistDataSection />
        }
      />
    </section>
  );
}
