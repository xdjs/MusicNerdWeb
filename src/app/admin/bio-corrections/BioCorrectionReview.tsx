'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function BioCorrectionReview({ id, onReviewed }: { id: string; onReviewed?: () => void }) {
  const router = useRouter();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function review(status: 'resolved' | 'dismissed') {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/bio-corrections/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (!response.ok) throw new Error('Could not review this report. Refresh and try again.');
      if (onReviewed) onReviewed();
      else router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not review report'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={() => review('resolved')}>Mark resolved</Button><Button variant="outline" disabled={busy} onClick={() => review('dismissed')}>Dismiss</Button>{error && <p role="alert">{error}</p>}</div>;
}
