"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateSourceStatus } from "@/app/actions/dashboardActions";
import type { getPendingLoreSources } from "@/server/utils/queries/getPendingLoreSources";
import surface from "@/app/profile/ProfileConcept.module.css";
import styles from "@/components/community/Community.module.css";

import { triggerLabels } from '@/lib/activity/activityLabels';

type Props = {
  data: Awaited<ReturnType<typeof getPendingLoreSources>>;
  onReview?: typeof updateSourceStatus;
};

export default function LoreSubmissionsSection({ data, onReview = updateSourceStatus }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(() => new Set());
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const visible = data.items.filter(item => !reviewedIds.has(item.id));
  const first = (data.page - 1) * data.pageSize + 1;
  const last = Math.min(data.page * data.pageSize, data.total);
  const pageHref = (page: number) => `/admin?section=lore&lorePage=${page}&loreQuery=${encodeURIComponent(data.query)}&loreOrigin=${data.origin ?? ''}&loreClaim=${data.claim ?? ''}`;

  async function review(id: string, artistName: string, status: "approved" | "rejected") {
    if (busyId) return;
    setBusyId(id);
    setFeedback(null);
    try {
      const result = await onReview(id, status, "pending");
      if (!result.success) {
        setFeedback({ kind: "error", message: result.error ?? "Could not review this Lore source." });
        return;
      }
      setReviewedIds(previous => new Set(previous).add(id));
      setFeedback({ kind: "success", message: `Lore source ${status} for ${artistName}.` });
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: "Could not review this Lore source. Refresh the queue before retrying." });
    } finally {
      setBusyId(null);
    }
  }

  return <div className="space-y-5">
    <Link href="/admin/contributions?origin=user&status=pending" className="inline-flex min-h-11 items-center text-sm underline">User submissions and contribution counts</Link>
    <form action="/admin" method="get" className={styles.filterBar} key={`${data.query}:${data.origin}:${data.claim}`}>
      <input type="hidden" name="section" value="lore" />
      <input type="search" name="loreQuery" aria-label="Search pending Lore" placeholder="Search artist, source, or contributor" defaultValue={data.query} maxLength={100} />
      <label className="flex min-w-0 flex-col gap-1 text-sm">Origin
        <select name="loreOrigin" defaultValue={data.origin ?? ''}>
          <option value="">All origins</option><option value="submission">User submissions</option>
          <option value="research">Automated research</option><option value="upload">Uploads</option><option value="unknown">Unknown origin</option>
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1 text-sm">Profile
        <select name="loreClaim" defaultValue={data.claim ?? ''}>
          <option value="">All profiles</option><option value="claimed">Claimed</option><option value="unclaimed">Unclaimed</option>
        </select>
      </label>
      <Button type="submit" variant="outline" className="min-h-11 rounded-xl">Search</Button>
      {(data.query || data.origin || data.claim) && <Link href="/admin?section=lore" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Clear</Link>}
    </form>
    <p className={styles.filterSummary}>{data.total === 0 ? "No pending Lore sources" : `Showing ${first}–${last} of ${data.total.toLocaleString()} pending Lore sources`}</p>
    {feedback && <p role={feedback.kind === "error" ? "alert" : "status"} className={feedback.kind === "error" ? "text-sm text-red-600 dark:text-red-400" : "text-sm text-green-700 dark:text-green-300"}>{feedback.message}</p>}
    {visible.length ? <div className={styles.loreList}>
      {visible.map(item => {
        const artistName = item.artistName ?? "Unknown artist";
        const actor = item.actorName || item.actorEmail || item.actorId || (item.actorKind === 'system' ? 'Music Nerd system' : item.actorKind === 'user' ? 'Deleted account' : 'Unknown initiator');
        const attribution = item.origin === 'research' ? `Research requested by ${actor}`
          : item.origin === 'submission' ? `Submitted by ${actor}`
          : item.origin === 'upload' ? `Uploaded by ${actor}` : 'Origin not recorded';
        return <article key={item.id} className={`${surface.surface} ${styles.loreCard}`}>
          <div className={styles.loreCardTop}>
            <div className="min-w-0">
              <Link href={`/artist/${item.artistId}`} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">{artistName}</Link>
              <p className="mt-1 text-sm text-muted-foreground">{item.title || "Lore source"}</p>
            </div>
            <div className={styles.loreActions}>
              <Button type="button" variant="outline" className={styles.approveButton} disabled={busyId !== null}
                aria-label={`Approve Lore source for ${artistName}`} onClick={() => void review(item.id, artistName, "approved")}>
                {busyId === item.id ? "Reviewing…" : "Approve"}
              </Button>
              <Button type="button" variant="outline" className={styles.loreReject} disabled={busyId !== null}
                aria-label={`Reject Lore source for ${artistName}`} onClick={() => void review(item.id, artistName, "rejected")}>Reject</Button>
            </div>
          </div>
          {/^(https?:)\/\//i.test(item.url)
            ? <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles.loreUrl}>{item.url}</a>
            : <p className={styles.loreUrl}>{item.url}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <p className="min-w-0 break-words">{attribution}</p>
            <span>{item.claimed ? 'Claimed profile' : 'Unclaimed profile'}</span>
            {item.trigger && <span>{triggerLabels[item.trigger] ?? item.trigger}</span>}
          </div>
          <p className={styles.loreDate}>Added {new Date(item.createdAt).toLocaleString('en-US', { timeZone: 'UTC' }) + ' UTC'}</p>
          {item.activityId && <Link className="text-sm underline underline-offset-4" href={`/admin?section=activity&activityId=${item.activityId}`}>View initiating activity</Link>}
        </article>;
      })}
    </div> : <p className="rounded-2xl border border-border p-6 text-sm text-muted-foreground">{data.query ? "No pending Lore sources match this search." : "No pending Lore sources on this page."}</p>}
    {(data.page > 1 || data.total > data.pageSize) && <nav aria-label="Lore review pages" className="flex items-center justify-between gap-4 text-sm">
      {data.page > 1 ? <Link href={pageHref(data.page - 1)} className={styles.pill}>Previous</Link> : <span />}
      <span>Page {data.page} of {Math.ceil(data.total / data.pageSize)}</span>
      {data.page * data.pageSize < data.total ? <Link href={pageHref(data.page + 1)} className={styles.pill}>Next</Link> : <span />}
    </nav>}
  </div>;
}
