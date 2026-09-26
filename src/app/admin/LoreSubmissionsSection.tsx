"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateSourceStatus } from "@/app/actions/dashboardActions";
import type { getPendingLoreSources } from "@/server/utils/queries/getPendingLoreSources";
import surface from "@/app/profile/ProfileConcept.module.css";
import styles from "@/components/community/Community.module.css";

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
  const pageHref = (page: number) => `/admin?section=lore&lorePage=${page}&loreQuery=${encodeURIComponent(data.query)}`;

  async function review(id: string, artistName: string, status: "approved" | "rejected") {
    if (busyId) return;
    setBusyId(id);
    setFeedback(null);
    try {
      const result = await onReview(id, status);
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
    <form action="/admin" method="get" className={styles.filterBar} key={data.query}>
      <input type="hidden" name="section" value="lore" />
      <input type="search" name="loreQuery" aria-label="Search pending Lore" placeholder="Search artist, title, or URL" defaultValue={data.query} maxLength={100} />
      <Button type="submit" variant="outline" className="min-h-11 rounded-xl">Search</Button>
      {data.query && <Link href="/admin?section=lore" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Clear</Link>}
    </form>
    <p className={styles.filterSummary}>{data.total === 0 ? "No pending Lore sources" : `Showing ${first}–${last} of ${data.total.toLocaleString()} pending Lore sources`}</p>
    {feedback && <p role={feedback.kind === "error" ? "alert" : "status"} className={feedback.kind === "error" ? "text-sm text-red-600 dark:text-red-400" : "text-sm text-green-700 dark:text-green-300"}>{feedback.message}</p>}
    {visible.length ? <div className={styles.loreList}>
      {visible.map(item => {
        const artistName = item.artistName ?? "Unknown artist";
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
          <p className={styles.loreDate}>Added {item.createdAt.slice(0, 10)}</p>
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
