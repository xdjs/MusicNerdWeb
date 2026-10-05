'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getContributorApprovalItems } from '@/app/actions/getContributorApprovalItems';
import { approveContributorSubmissions } from '@/app/actions/approveContributorSubmissions';
import { CONTRIBUTOR_APPROVAL_BATCH, type ContributorApprovalItem } from '@/lib/contributions/contributorApprovalTypes';

export default function BulkApproveContributor({ contributorId, contributorName }: { contributorId: string; contributorName: string }) {
  const router = useRouter();
  const inFlight = useRef(false);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<'loading' | 'review' | 'approving' | 'done'>('loading');
  const [items, setItems] = useState<ContributorApprovalItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);
  const [progress, setProgress] = useState(0);

  async function preview() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPhase('loading'); setFeedback(null); setItems([]); setProgress(0); setOpen(true);
    try {
      const result = await getContributorApprovalItems(contributorId);
      if (!result.success) {
        setFeedback({ error: true, message: result.error ?? 'Could not load pending submissions.' });
        setPhase('done');
      } else {
        setItems(result.items ?? []); setHasMore(!!result.hasMore); setPhase('review');
      }
    } catch { setFeedback({ error: true, message: 'Could not load pending submissions. Please try again.' }); setPhase('done'); }
    finally { inFlight.current = false; }
  }

  async function approve() {
    if (inFlight.current || !items.length) return;
    inFlight.current = true; setPhase('approving'); setFeedback(null);
    let approved = 0, skipped = 0, failed = 0;
    const warnings = new Set<string>();
    let error: string | undefined;
    try {
      for (let start = 0; start < items.length; start += CONTRIBUTOR_APPROVAL_BATCH) {
        const batch = items.slice(start, start + CONTRIBUTOR_APPROVAL_BATCH).map(({ id, type }) => ({ id, type }));
        const result = await approveContributorSubmissions(contributorId, batch);
        approved += result.approved; skipped += result.skipped; failed += result.failed;
        if (result.warning) warnings.add(result.warning);
        if (result.error) { error = result.error; break; }
        setProgress(Math.min(start + batch.length, items.length));
      }
    } catch { error = 'The last batch could not be confirmed. Refresh the history before retrying.'; }
    finally {
      setFeedback({ error: failed > 0 || !!error, message: [
        `${approved} approved · ${skipped} skipped · ${failed} failed.`,
        skipped ? 'Skipped items were already reviewed or no longer match this contributor.' : '',
        failed ? 'Failed items remain pending for individual review.' : '',
        ...warnings, error,
      ].filter(Boolean).join(' ') });
      setPhase('done'); inFlight.current = false; router.refresh();
    }
  }

  return <>
    <Button variant="pink" className="min-h-11 w-full sm:w-auto" onClick={() => void preview()}>Bulk approve</Button>
    <Dialog open={open} onOpenChange={next => { if (!inFlight.current) setOpen(next); }}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl">
        <DialogHeader className="pr-6 text-left">
          <DialogTitle>Approve submissions from {contributorName}</DialogTitle>
          <DialogDescription>
            Pending Lore and link suggestions across all pages, regardless of your current filters. Automated research, unknown origins and completed reviews are excluded.
          </DialogDescription>
        </DialogHeader>
        {phase === 'loading' && <p role="status">Loading pending submissions…</p>}
        {phase === 'review' && !items.length && <p>No pending submissions from this contributor.</p>}
        {phase === 'review' && items.length > 0 && <>
          <p className="text-sm">{items.filter(item => item.type !== 'link').length} Lore · {items.filter(item => item.type === 'link').length} link suggestions</p>
          {hasMore && <p className="text-sm text-muted-foreground">Showing the first {items.length} pending submissions. You can review the next batch afterward.</p>}
          <ul className="max-h-64 space-y-3 overflow-y-auto rounded-xl border p-3 text-sm">
            {items.map(item => <li key={`${item.type}:${item.id}`} className="space-y-1 break-words">
              <p className="font-medium">{item.title || (item.type === 'link' ? 'Link suggestion' : 'Lore source')}</p>
              <p className="text-muted-foreground">{item.artistName || 'Unknown artist'} · {item.type === 'link' ? 'Link' : 'Lore'}</p>
              {item.url && /^https?:\/\//i.test(item.url) && <a className="block break-all underline underline-offset-2" href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a>}
            </li>)}
          </ul>
        </>}
        {phase === 'approving' && <p role="status">Reviewing {progress} of {items.length} submissions…</p>}
        {feedback && <p role={feedback.error ? 'alert' : 'status'} className="text-sm">{feedback.message}</p>}
        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={phase === 'loading' || phase === 'approving'} onClick={() => setOpen(false)}>{phase === 'done' ? 'Done' : 'Cancel'}</Button>
          {phase === 'review' && items.length > 0 && <Button variant="pink" onClick={() => void approve()}>Approve {items.length} submissions</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
