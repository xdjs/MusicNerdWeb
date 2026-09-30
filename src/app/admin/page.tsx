import { getArtistActivity } from '@/server/utils/activity/getArtistActivity';
import ArtistActivitySection from './ArtistActivitySection';
import { getServerAuthSession } from "@/server/auth";
import { redirect } from "next/navigation";
import { getUserById, getAllUsers } from "@/server/utils/queries/userQueries";
import { getPendingUGC } from "@/server/utils/queries/artistQueries";
import { getAllClaims } from "@/server/utils/queries/dashboardQueries";
import { getPendingLoreSources } from "@/server/utils/queries/getPendingLoreSources";
import { getAllMcpKeys } from "@/server/utils/queries/mcpKeyQueries";
import AdminDashboard from "./AdminDashboard";
import type { ClaimRow } from "./claims-columns";

type AdminSearchParams = { section?: string | string[]; lorePage?: string | string[]; loreQuery?: string | string[]; loreOrigin?: string | string[]; loreClaim?: string | string[]; activityPage?: string | string[]; activityQuery?: string | string[]; activityAction?: string | string[]; activityId?: string | string[] };
const firstParam = (value: string | string[] | undefined) => typeof value === "string" ? value : value?.[0] ?? "";

export default async function Admin({ searchParams }: { searchParams: Promise<AdminSearchParams> }) {
  const session = await getServerAuthSession();

  if (!session) {
    redirect('/');
  }

  const user = await getUserById(session.user.id);
  if (!user?.isAdmin) {
    redirect('/');
  }

  const params = await searchParams;
  const lorePage = Number(firstParam(params.lorePage));
  const loreQuery = firstParam(params.loreQuery);
  const [pendingUGCData, pendingLore, allUsers, mcpKeys, rawClaims, activity] = await Promise.all([
    getPendingUGC(),
    getPendingLoreSources({ page: lorePage, query: loreQuery, origin: firstParam(params.loreOrigin), claim: firstParam(params.loreClaim) }),
    getAllUsers(),
    getAllMcpKeys(),
    getAllClaims(),
    getArtistActivity({ page: Number(firstParam(params.activityPage)), query: firstParam(params.activityQuery), action: firstParam(params.activityAction), eventId: firstParam(params.activityId) }),
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

  return <AdminDashboard key={firstParam(params.section)} activityContent={<ArtistActivitySection data={activity} />} pendingUGCData={pendingUGCData} pendingLore={pendingLore} allUsers={allUsers} mcpKeys={mcpKeys} allClaims={allClaims} initialSection={firstParam(params.section) === "users" ? "users" : firstParam(params.section) === "activity" ? "activity" : firstParam(params.section) === "lore" ? "lore" : "ugc"} />;
}
