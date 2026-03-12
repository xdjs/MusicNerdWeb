import { getServerAuthSession } from "@/server/auth";
import { redirect } from "next/navigation";
import { getUserById, getAllUsers } from "@/server/utils/queries/userQueries";
import { getPendingUGC } from "@/server/utils/queries/artistQueries";
import { db } from "@/server/db/drizzle";
import { mcpApiKeys } from "@/server/db/schema";
import { desc } from "drizzle-orm";
import UGCDataTable from "./ugc-data-table";
import { ugcColumns, whitelistedColumns } from "./columns";
import UsersSection from "./UsersSection";
import AdminTabs from "./AdminTabs";
import McpKeysSection from "./McpKeysSection";

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
  const [pendingUGCData, allUsers, allMcpKeys] = await Promise.all([
    getPendingUGC(),
    getAllUsers(),
    db
      .select({
        id: mcpApiKeys.id,
        label: mcpApiKeys.label,
        keyHashPrefix: mcpApiKeys.keyHash,
        createdAt: mcpApiKeys.createdAt,
        revokedAt: mcpApiKeys.revokedAt,
      })
      .from(mcpApiKeys)
      .orderBy(desc(mcpApiKeys.createdAt)),
  ]);

  // Only expose first 8 chars of hash for identification
  const sanitizedKeys = allMcpKeys.map((k) => ({
    ...k,
    keyHashPrefix: k.keyHashPrefix.slice(0, 8),
  }));

  return (
    <section className="admin-page px-4 sm:px-10 py-5 space-y-6">
      <h1 className="text-3xl font-bold text-center mb-8">Admin Dashboard</h1>

      <AdminTabs
        ugcCount={pendingUGCData.length}
        ugcContent={
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-[#9b83a0]">
              Pending UGC Submissions ({pendingUGCData.length})
            </h2>
            <UGCDataTable columns={ugcColumns} data={pendingUGCData} />
          </div>
        }
        usersContent={
          <UsersSection columns={whitelistedColumns} data={allUsers || []} />
        }
        mcpKeysContent={
          <McpKeysSection initialKeys={sanitizedKeys} />
        }
      />
    </section>
  );
}
