import type { approveUgcAdminAction } from "@/app/actions/serverActions";
import type { getPendingUGC } from "@/server/utils/queries/artistQueries";
import type { getAllUsers } from "@/server/utils/queries/userQueries";
import type { getAllMcpKeys } from "@/server/utils/queries/mcpKeyQueries";
import UGCDataTable from "./ugc-data-table";
import { ugcColumns, whitelistedColumns } from "./columns";
import ClaimsDataTable from "./claims-data-table";
import { claimsColumns } from "./claims-columns";
import type { ClaimRow } from "./claims-columns";
import UsersSection from "./UsersSection";
import AdminTabs from "./AdminTabs";
import McpKeysSection from "./McpKeysSection";
import AgentWorkSection from "./AgentWorkSection";
import ArtistDataSection from "./ArtistDataSection";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import surface from "@/app/profile/ProfileConcept.module.css";
import styles from "@/components/community/Community.module.css";

type Props = {
  pendingUGCData: Awaited<ReturnType<typeof getPendingUGC>>;
  allUsers: Awaited<ReturnType<typeof getAllUsers>>;
  mcpKeys: Awaited<ReturnType<typeof getAllMcpKeys>>;
  allClaims: ClaimRow[];
  onApproveLinks?: typeof approveUgcAdminAction;
};

export default function AdminDashboard({pendingUGCData,allUsers,mcpKeys,allClaims,onApproveLinks}: Props) {
  const pendingClaimsCount = allClaims.filter(c => c.status === "pending").length;

  return (
    <section className={`${surface.concept} ${styles.page} mx-auto w-full min-w-0 max-w-6xl px-5 sm:px-10 pb-16 text-foreground`}>
      <header className={styles.header}><div><h1>Admin dashboard</h1><p className={styles.description}>Review community contributions and keep artist profiles up to date.</p></div><Link href="/profile" className={styles.pill}>Your profile <ArrowUpRight size={15}/></Link></header>

      <AdminTabs
        ugcCount={pendingUGCData.length}
        claimsCount={pendingClaimsCount}
        ugcContent={
          <UGCDataTable columns={ugcColumns} data={pendingUGCData} onApprove={onApproveLinks} />
        }
        claimsContent={
          <ClaimsDataTable columns={claimsColumns} data={allClaims} />
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
