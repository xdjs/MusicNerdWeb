'use client';
import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function BioCorrectionDialog({ artistId, artistName, bio, portrait = false }: { artistId: string; artistName: string; bio: string; portrait?: boolean }) {
  const { authenticated, ready, login } = usePrivy();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('incorrect');
  const [details, setDetails] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!authenticated) { setOpen(false); login(); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/artist/${artistId}/bio-corrections`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason, details, sourceUrl, expectedBio: bio }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not send your suggestion');
      setSent(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send your suggestion. Please try again.'); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><button type="button" className={`min-h-11 text-sm underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pastypink ${portrait ? 'text-white/80 hover:text-white' : 'text-gray-700 dark:text-gray-200'}`}>Suggest a correction</button></DialogTrigger>
    <DialogContent className="max-h-[90dvh] overflow-y-auto">
      <DialogHeader><DialogTitle>Suggest a correction</DialogTitle><DialogDescription>Help improve {artistName}&apos;s About. A person will review your suggestion before any changes are made.</DialogDescription></DialogHeader>
      {sent ? <div className="space-y-4"><p role="status">Thanks — your suggestion is in the review queue.</p><Button onClick={() => setOpen(false)}>Done</Button></div> : <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-2"><span>What needs fixing?</span><select value={reason} onChange={e => setReason(e.target.value)} className="min-h-11 w-full rounded-md border bg-background p-2"><option value="incorrect">Incorrect information</option><option value="wrong_artist">This is about a different artist</option><option value="outdated">Outdated information</option><option value="other">Something else</option></select></label>
        <label className="block space-y-2"><span>Details <span className="text-muted-foreground">(optional)</span></span><textarea value={details} onChange={e => setDetails(e.target.value)} maxLength={2000} rows={3} className="w-full rounded-md border bg-background p-2" placeholder="What should we check?"/></label>
        <label className="block space-y-2"><span>Source link <span className="text-muted-foreground">(optional)</span></span><input type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} maxLength={2048} className="min-h-11 w-full rounded-md border bg-background p-2" placeholder="https://"/></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={busy || !ready}>{busy ? 'Sending…' : authenticated ? 'Send suggestion' : 'Sign in to send'}</Button>
      </form>}
    </DialogContent>
  </Dialog>;
}
