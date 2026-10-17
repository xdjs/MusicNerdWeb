import { getAdminReviewQueue } from '@/server/utils/contributions/getAdminReviewQueue';
import { getArtistActivity } from '@/server/utils/activity/getArtistActivity';
import ArtistActivitySection from './ArtistActivitySection';
import { getServerAuthSession } from "@/server/auth";
import { redirect } from "next/navigation";
import { getUserById, getAllUsers } from "@/server/utils/queries/userQueries";
import { getAllClaims } from "@/server/utils/queries/dashboardQueries";
import { getAllMcpKeys } from "@/server/utils/queries/mcpKeyQueries";
import AdminDashboard from "./AdminDashboard";
import type { ClaimRow } from "./claims-columns";

type AdminSearchParams = Record<string, string | string[] | undefined>;
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
  const section = firstParam(params.section);
  const reviewType = firstParam(params.reviewType) || (section === 'corrections' ? 'corrections' : section === 'ugc' ? 'links' : 'all');
  const [reviews, allUsers, mcpKeys, rawClaims, activity] = await Promise.all([
    getAdminReviewQueue({type:reviewType,query:firstParam(params.reviewQuery) || firstParam(params.loreQuery),page:Number(firstParam(params.reviewPage) || firstParam(params.lorePage))}),
    getAllUsers(), getAllMcpKeys(), getAllClaims(),
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

  return <AdminDashboard reviews={reviews} key={section} activityContent={<ArtistActivitySection data={activity} />} allUsers={allUsers} mcpKeys={mcpKeys} allClaims={allClaims} initialSection={section === 'users' ? 'users' : section === 'activity' ? 'activity' : 'lore'} />;
}
