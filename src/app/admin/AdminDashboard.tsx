import LoreReviewQueue from './LoreReviewQueue';
import type { AdminUser, McpKey, ReviewQueue } from "@/lib/admin/adminReadTypes";
import { whitelistedColumns } from "./columns";
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
  reviews: ReviewQueue;
  allUsers: AdminUser[];
  mcpKeys: McpKey[];
  allClaims: ClaimRow[];
  initialSection?: "ugc" | "lore" | "activity" | "users" | "corrections";
  activityContent?: React.ReactNode;
  artistDataUrl?: string; agentWorkUrl?: string;
};

export default function AdminDashboard({reviews,allUsers,mcpKeys,allClaims,initialSection,activityContent,artistDataUrl,agentWorkUrl}: Props) {
  const pendingClaimsCount = allClaims.filter(c => c.status === "pending").length;

  return (
    <section className={`${surface.concept} ${styles.page} mx-auto w-full min-w-0 max-w-6xl px-5 sm:px-10 pb-16 text-foreground`}>
      <header className={styles.header}><div><h1>Admin dashboard</h1><p className={styles.description}>Review community contributions and keep artist profiles up to date.</p></div><Link href="/profile" className={styles.pill}>Your profile <ArrowUpRight size={15}/></Link></header>

      <AdminTabs
        correctionsCount={reviews.pendingCounts.corrections}
        ugcCount={reviews.pendingCounts.links}
        loreCount={reviews.pendingCounts.sources}
        claimsCount={pendingClaimsCount}
        initialSection={initialSection}
        reviewContent={<LoreReviewQueue key={`${reviews.type}:${reviews.query}:${reviews.page}`} data={reviews}/>}
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
