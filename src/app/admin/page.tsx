import AdminView from "./AdminView";
import { adminReviewQueuePath } from "@/lib/admin/adminReviewQueuePath";
import { adminActivityPath } from "@/lib/admin/adminActivityPath";
import { firstParam, type SearchParams } from "@/lib/admin/firstParam";

export default async function Admin({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const section = firstParam(params.section);
  return <AdminView key={section} initialSection={section === 'users' ? 'users' : section === 'activity' ? 'activity' : 'lore'}
    reviewPath={adminReviewQueuePath(params)} activityPath={adminActivityPath(params)} />;
}
