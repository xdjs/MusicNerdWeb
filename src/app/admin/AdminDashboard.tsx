import type { approveUgcAdminAction } from "@/app/actions/serverActions";
import type { getPendingUGC } from "@/server/utils/queries/artistQueries";
import type { getPendingLoreSources } from "@/server/utils/queries/getPendingLoreSources";
import type { getAllUsers } from "@/server/utils/queries/userQueries";
import type { getAllMcpKeys } from "@/server/utils/queries/mcpKeyQueries";
import UGCDataTable from "./ugc-data-table";
import LoreSubmissionsSection from "./LoreSubmissionsSection";
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
  pendingLore: Awaited<ReturnType<typeof getPendingLoreSources>>;
  allUsers: Awaited<ReturnType<typeof getAllUsers>>;
  mcpKeys: Awaited<ReturnType<typeof getAllMcpKeys>>;
  allClaims: ClaimRow[];
  onApproveLinks?: typeof approveUgcAdminAction;
  initialSection?: "ugc" | "lore" | "activity";
  activityContent?: React.ReactNode;
  artistDataUrl?: string; agentWorkUrl?: string;
};

export default function AdminDashboard({pendingUGCData,pendingLore,allUsers,mcpKeys,allClaims,onApproveLinks,initialSection,activityContent,artistDataUrl,agentWorkUrl}: Props) {
  const pendingClaimsCount = allClaims.filter(c => c.status === "pending").length;

  return (
    <section className={`${surface.concept} ${styles.page} mx-auto w-full min-w-0 max-w-6xl px-5 sm:px-10 pb-16 text-foreground`}>
      <header className={styles.header}><div><h1>Admin dashboard</h1><p className={styles.description}>Review community contributions and keep artist profiles up to date.</p></div><Link href="/profile" className={styles.pill}>Your profile <ArrowUpRight size={15}/></Link></header>

      <AdminTabs
        ugcCount={pendingUGCData.length}
        loreCount={pendingLore.pendingTotal}
        claimsCount={pendingClaimsCount}
        initialSection={initialSection}
        ugcContent={
          <UGCDataTable columns={ugcColumns} data={pendingUGCData} onApprove={onApproveLinks} />
        }
        loreContent={<LoreSubmissionsSection data={pendingLore} />}
        activityContent={activityContent}
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
          <AgentWorkSection dataUrl={agentWorkUrl} />
        }
        artistDataContent={
          <ArtistDataSection dataUrl={artistDataUrl} />
        }
      />
    </section>
  );
}
