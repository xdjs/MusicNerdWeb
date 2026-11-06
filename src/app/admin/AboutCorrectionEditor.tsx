'use client';

import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MAX_BIO_LENGTH } from '@/lib/bio/bioConstants';
import type { CorrectionAbout } from '@/lib/bio/correctionAboutTypes';
import { requestAdminApi } from '@/lib/admin/requestAdminApi';

export default function AboutCorrectionEditor({ reportId, disabled, onSaved, onEditingChange }: {
  reportId: string; disabled: boolean; onSaved: () => void; onEditingChange: (editing: boolean) => void;
}) {
  const id = useId();
  const [context, setContext] = useState<CorrectionAbout | null>(null);
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  async function open() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); onEditingChange(true);
    try {
      const response = await requestAdminApi(`/api/admin/bio-corrections/${reportId}/about`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not load the current About.');
      setContext({ bio: result.bio, revision: result.revision }); setBio(result.bio);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the current About.'); onEditingChange(false);
    } finally { inFlight.current = false; setBusy(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current || !context) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const response = await requestAdminApi(`/api/admin/bio-corrections/${reportId}/about`, {
        method: 'PUT', body: { bio: bio.trim(), revision: context.revision },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not save. Your draft is kept.');
      onEditingChange(false); onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save. Your draft is kept.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <div className="space-y-3">
    {context ? <form onSubmit={save} className="space-y-3 rounded-xl border border-border bg-black/[0.02] p-4 dark:bg-white/[0.02]">
      <div className="space-y-1"><label htmlFor={id} className="block text-sm font-semibold">Current About</label><p id={`${id}-help`} className="text-xs leading-relaxed text-muted-foreground">Edit the published text below. Saving updates the artist’s About and resolves this report.</p></div>
      <textarea id={id} aria-describedby={`${id}-help`} autoFocus value={bio} onChange={event => setBio(event.target.value)} disabled={busy} maxLength={MAX_BIO_LENGTH} rows={8} className="w-full resize-y rounded-xl border border-input bg-black/[0.02] p-3 text-base leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pastypink/60 dark:bg-white/5 sm:text-sm" />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={busy || !bio.trim()} className="min-h-11 rounded-xl button-pink bg-highlightpink px-4 py-2.5 text-sm font-semibold text-[#111] hover:bg-highlightpink/80">{busy ? 'Saving…' : 'Save and resolve'}</Button>
        <Button type="button" variant="outline" disabled={busy} className="min-h-11 rounded-xl px-4" onClick={() => { setContext(null); setError(''); onEditingChange(false); }}>Cancel</Button>
      </div>
    </form> : <>
      <Button type="button" disabled={disabled || busy} className="min-h-11 rounded-xl button-pink bg-highlightpink px-4 py-2.5 text-sm font-semibold text-[#111] hover:bg-highlightpink/80" onClick={() => void open()}>{busy ? 'Loading About…' : 'Edit About'}</Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </>}
  </div>;
}
