"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { updateSourceStatus } from "@/app/actions/dashboardActions";
import { approveSelectedLoreSources } from "@/app/actions/approveSelectedLoreSources";
import { LORE_APPROVAL_BATCH } from "@/lib/contributions/loreApprovalTypes";
import type { getPendingLoreSources } from "@/server/utils/queries/getPendingLoreSources";
import surface from "@/app/profile/ProfileConcept.module.css";
import styles from "@/components/community/Community.module.css";

import { triggerLabels } from '@/lib/activity/activityLabels';

type Props = {
  data: Awaited<ReturnType<typeof getPendingLoreSources>>;
  onReview?: typeof updateSourceStatus;
  onApproveSelected?: typeof approveSelectedLoreSources;
};

export default function LoreSubmissionsSection(props: Props) {
  const { data } = props;
  // Route refreshes retain selection, while page/filter navigation resets all review state.
  return <LoreQueue key={JSON.stringify([data.page, data.query, data.origin, data.claim])} {...props} />;
}

function LoreQueue({ data, onReview = updateSourceStatus, onApproveSelected = approveSelectedLoreSources }: Props) {
  const router = useRouter();
  const inFlight = useRef(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [confirmation, setConfirmation] = useState<Props['data']['items'] | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(() => new Set());
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const visible = data.items.filter(item => !reviewedIds.has(item.id));
  const selected = visible.filter(item => selectedIds.has(item.id));
  const busy = busyId !== null || bulkBusy;
  const first = (data.page - 1) * data.pageSize + 1;
  const last = Math.min(data.page * data.pageSize, data.total);
  const pageHref = (page: number) => `/admin?section=lore&lorePage=${page}&loreQuery=${encodeURIComponent(data.query)}&loreOrigin=${data.origin ?? ''}&loreClaim=${data.claim ?? ''}`;

  async function review(id: string, artistName: string, status: "approved" | "rejected") {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusyId(id);
    setFeedback(null);
    try {
      const result = await onReview(id, status, "pending");
      if (!result.success) {
        setFeedback({ kind: "error", message: result.error ?? "Could not review this Lore source." });
        return;
      }
      setReviewedIds(previous => new Set(previous).add(id));
      setSelectedIds(previous => new Set([...previous].filter(selectedId => selectedId !== id)));
      setFeedback({ kind: "success", message: `Lore source ${status} for ${artistName}.` });
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: "Could not review this Lore source. Refresh the queue before retrying." });
    } finally {
      inFlight.current = false;
      setBusyId(null);
    }
  }

  async function approveSelection() {
    if (inFlight.current || !confirmation?.length) return;
    inFlight.current = true; setBulkBusy(true); setFeedback(null);
    const approved: string[] = [], skipped: string[] = [], failed: string[] = [];
    const warnings = new Set<string>();
    let error: string | undefined;
    try {
      for (let start = 0; start < confirmation.length; start += LORE_APPROVAL_BATCH) {
        const ids = confirmation.slice(start, start + LORE_APPROVAL_BATCH).map(item => item.id);
        const result = await onApproveSelected(ids);
        approved.push(...result.approvedIds); skipped.push(...result.skippedIds); failed.push(...result.failedIds);
        if (result.warning) warnings.add(result.warning);
        if (result.error) { error = result.error; break; }
      }
    } catch { error = 'The last batch could not be confirmed. Refresh the queue before retrying.'; }
    finally {
      const completed = new Set([...approved, ...skipped]);
      setReviewedIds(previous => new Set([...previous, ...completed]));
      setSelectedIds(previous => new Set([...previous].filter(id => !completed.has(id))));
      setFeedback({ kind: failed.length || error ? 'error' : 'success', message: [
        `${approved.length} approved · ${skipped.length} skipped · ${failed.length} failed.`,
        skipped.length ? 'Skipped sources were already reviewed or are no longer available.' : '',
        failed.length ? 'Failed sources remain selected for review.' : '',
        ...warnings, error,
      ].filter(Boolean).join(' ') });
      setConfirmation(null); setBulkBusy(false); inFlight.current = false; router.refresh();
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
    {visible.length > 0 && <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border p-3">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <Checkbox aria-label="Select all on this page" disabled={busy}
          checked={selected.length === visible.length ? true : selected.length ? 'indeterminate' : false}
          onCheckedChange={checked => setSelectedIds(new Set(checked === true ? visible.map(item => item.id) : []))} />
        Select all on this page
      </label>
      <span className="text-sm text-muted-foreground">{selected.length} selected</span>
      <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
        {selected.length > 0 && <Button variant="ghost" className="min-h-11" disabled={busy} onClick={() => setSelectedIds(new Set())}>Clear selection</Button>}
        <Button variant="pink" className="min-h-11" disabled={busy || !selected.length} onClick={() => { setFeedback(null); setConfirmation([...selected]); }}>Approve selected ({selected.length})</Button>
      </div>
    </div>}
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
            <div className="flex min-w-0 items-start gap-2">
              <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
                <Checkbox disabled={busy} checked={selectedIds.has(item.id)}
                  aria-label={`Select ${item.title || 'Lore source'} for ${artistName}`}
                  onCheckedChange={checked => setSelectedIds(previous => {
                    const next = new Set(previous);
                    if (checked === true) next.add(item.id); else next.delete(item.id);
                    return next;
                  })} />
              </label>
              <div className="min-w-0">
                <Link href={`/artist/${item.artistId}`} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">{artistName}</Link>
                <p className="mt-1 break-words text-sm text-muted-foreground">{item.title || "Lore source"}</p>
              </div>
            </div>
            <div className={styles.loreActions}>
              <Button type="button" variant="outline" className={styles.approveButton} disabled={busy}
                aria-label={`Approve Lore source for ${artistName}`} onClick={() => void review(item.id, artistName, "approved")}>
                {busyId === item.id ? "Reviewing…" : "Approve"}
              </Button>
              <Button type="button" variant="outline" className={styles.loreReject} disabled={busy}
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
    <Dialog open={confirmation !== null} onOpenChange={open => { if (!open && !inFlight.current) setConfirmation(null); }}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl">
        <DialogHeader className="pr-6 text-left">
          <DialogTitle>Approve selected Lore sources</DialogTitle>
          <DialogDescription>Only the sources listed below will be approved. Sources on other pages and new arrivals are not included.</DialogDescription>
        </DialogHeader>
        <ul className="max-h-64 space-y-3 overflow-y-auto rounded-xl border p-3 text-sm">
          {confirmation?.map(item => <li key={item.id} className="space-y-1 break-words">
            <p className="font-medium">{item.title || 'Lore source'}</p>
            <p className="text-muted-foreground">{item.artistName || 'Unknown artist'}</p>
            {/^(https?:)\/\//i.test(item.url)
              ? <a className="block break-all underline underline-offset-2" href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a>
              : <p className="break-all">{item.url}</p>}
          </li>)}
        </ul>
        {bulkBusy && <p role="status" className="text-sm">Approving selected sources…</p>}
        <DialogFooter className="gap-2">
          <Button variant="outline" className="min-h-11" disabled={bulkBusy} onClick={() => setConfirmation(null)}>Cancel</Button>
          <Button variant="pink" className="min-h-11" disabled={bulkBusy} onClick={() => void approveSelection()}>
            Approve {confirmation?.length ?? 0} {confirmation?.length === 1 ? 'source' : 'sources'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
