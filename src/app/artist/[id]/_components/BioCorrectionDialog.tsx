'use client';
import { Loader2 } from 'lucide-react';
import dialogScroll from './onboarding/ApiInterviewDialog.module.css';
import MusicNerdSelect from '@/components/ui/MusicNerdSelect';
import { useEffect, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useMusicNerdUser } from '@/hooks/useMusicNerdUser';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { requestBioCorrection } from '@/lib/bio/requestBioCorrection';

export default function BioCorrectionDialog({ artistId, artistName, bio, portrait = false }: { artistId: string; artistName: string; bio: string; portrait?: boolean }) {
  const { authenticated, ready, login } = usePrivy();
  const { status: userStatus } = useMusicNerdUser();
  const signedIn = authenticated && userStatus === 'authenticated';
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('incorrect');
  const [details, setDetails] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [error, setError] = useState('');
  const [resume, setResume] = useState(false);
  const [expectedBio, setExpectedBio] = useState(bio);
  const awaitingLogin = useRef(false);
  const submitting = useRef(false);
  const finishingSignIn = resume && (!ready || !signedIn);
  const draftKey = `mn:bio-correction:${artistId}`;
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(draftKey);
      if (saved) {
        const draft = JSON.parse(saved);
        if (typeof draft.details === 'string' && typeof draft.sourceUrl === 'string' && typeof draft.bio === 'string'
          && ['incorrect', 'wrong_artist', 'outdated', 'other'].includes(draft.reason)) {
          setReason(draft.reason); setDetails(draft.details); setSourceUrl(draft.sourceUrl); setExpectedBio(draft.bio);
          awaitingLogin.current = true;
        }
      }
    } catch { /* In-memory draft still survives a non-redirect login. */ }
    if (awaitingLogin.current && (authenticated || !ready)) {
      if (ready && signedIn) awaitingLogin.current = false;
      setResume(true); setOpen(true);
    }
  }, [signedIn, authenticated, ready, draftKey]);
  // Keep the draft through both authentication stages and incidental reloads,
  // until a confirmed send or deliberate dismissal.
  useEffect(() => {
    if (!resume || !open || sent) return;
    try { sessionStorage.setItem(draftKey, JSON.stringify({ reason, details, sourceUrl, bio: expectedBio })); }
    catch { /* The in-memory draft remains available. */ }
  }, [resume, open, sent, draftKey, reason, details, sourceUrl, expectedBio]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    if (!signedIn) {
      try { sessionStorage.setItem(draftKey, JSON.stringify({ reason, details, sourceUrl, bio: expectedBio })); }
      catch { setError('Your browser could not save this draft. Keep this tab open while signing in.'); }
      awaitingLogin.current = true; setOpen(false); if (!authenticated) login(); return;
    }
    submitting.current = true;
    setBusy(true); setError('');
    try {
      const response = await requestBioCorrection(artistId, { reason, details, sourceUrl, expectedBio });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not send your suggestion');
      setDuplicate(result.duplicate === true); setSent(true); setResume(false);
      try { sessionStorage.removeItem(draftKey); } catch { /* Storage can be unavailable. */ }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send your suggestion. Please try again.'); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={next => {
    if (submitting.current) return;
    if (next && sent) {
      setSent(false); setDuplicate(false); setReason('incorrect');
      setDetails(''); setSourceUrl(''); setError(''); setExpectedBio(bio);
    }
    if (next && !signedIn) {
      try { sessionStorage.setItem(draftKey, JSON.stringify(sent ? { reason: 'incorrect', details: '', sourceUrl: '', bio } : { reason, details, sourceUrl, bio: expectedBio })); } catch { /* In-memory intent is retained. */ }
      awaitingLogin.current = true;
      if (!authenticated) login();
      return;
    }
    setOpen(next);
    if (!next) {
      awaitingLogin.current = false; setResume(false);
      try { sessionStorage.removeItem(draftKey); } catch { /* Storage can be unavailable. */ }
    }
  }}>
    <DialogTrigger asChild><button type="button" disabled={!ready} className={`min-h-11 text-sm underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pastypink ${portrait ? 'text-white/80 hover:text-white' : 'text-gray-700 dark:text-gray-200'}`}>Suggest a correction</button></DialogTrigger>
    <DialogContent className={`${dialogScroll.dialog} mn-themed-dialog max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-xl p-5 sm:p-6`}>
      <DialogHeader className="mb-4 shrink-0 space-y-1.5 pr-7 text-left"><DialogTitle className="text-xl font-semibold leading-snug tracking-tight">{finishingSignIn ? 'Finishing sign-in…' : sent ? (duplicate ? 'Report already received' : 'Report received') : 'Suggest a correction'}</DialogTitle><DialogDescription className="text-sm leading-relaxed text-muted-foreground">{finishingSignIn ? 'Your correction form will open when sign-in is complete. Nothing has been submitted.' : sent ? 'Our team will review your suggestion before making any changes.' : <>Help improve {artistName}&apos;s About. A person will review your suggestion before any changes are made.</>}</DialogDescription></DialogHeader>
      {finishingSignIn ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" aria-hidden="true" />Finishing sign-in…</p> : sent ? <div className="space-y-4"><p role="status">{duplicate ? 'This exact report is already in our review queue. No duplicate was added.' : 'Your report was received and is in our review queue.'}</p><Button onClick={() => setOpen(false)}>Done</Button></div> : <form onSubmit={submit} className="flex min-h-0 flex-col">
        <div className={`${dialogScroll.body} space-y-4 pr-1`}>
        {resume && <p role="status" className="text-sm leading-relaxed">You’re signed in. Complete your report and select Submit report below. It has not been submitted yet.</p>}
        <label className="block space-y-2 text-sm font-medium"><span>What needs fixing?</span><MusicNerdSelect label="What needs fixing?" value={reason} onValueChange={setReason} options={[{value:'incorrect',label:'Incorrect information'},{value:'wrong_artist',label:'This is about a different artist'},{value:'outdated',label:'Outdated information'},{value:'other',label:'Something else'}]} /></label>
        <label className="block space-y-2 text-sm font-medium"><span>Details <span className="text-muted-foreground">(optional)</span></span><textarea value={details} onChange={e => setDetails(e.target.value)} maxLength={2000} rows={5} className="w-full resize-y rounded-xl border border-input bg-black/[0.02] p-3 text-base sm:text-sm leading-relaxed text-foreground dark:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pastypink/60" placeholder="What should we check?"/></label>
        <label className="block space-y-2 text-sm font-medium"><span>Source link <span className="text-muted-foreground">(optional)</span></span><input type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} maxLength={2048} className="min-h-11 w-full rounded-xl border border-input bg-black/[0.02] p-3 text-base sm:text-sm text-foreground dark:bg-white/5" placeholder="https://"/></label>
        </div>
        <div className="shrink-0 space-y-3 pt-4">
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button className="min-h-11 rounded-xl button-pink bg-highlightpink px-4 py-2.5 text-sm font-semibold text-[#111] hover:bg-highlightpink/80" type="submit" disabled={busy || !ready || !signedIn}>{busy ? 'Submitting…' : 'Submit report'}</Button>
        </div>
      </form>}
    </DialogContent>
  </Dialog>;
}
