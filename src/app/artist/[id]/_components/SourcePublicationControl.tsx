'use client';

import { useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EditModeContext } from '@/app/_components/EditModeContext';
import { setSourcePublicationAction } from '@/app/actions/setSourcePublicationAction';
import { Button } from '@/components/ui/button';
import type { ArtistVaultSource } from '@/server/db/DbTypes';

/** Shown only to administrators; the server independently authorizes every decision. */
export default function SourcePublicationControl({ source }: { source: ArtistVaultSource }) {
  const { editingBlocked } = useContext(EditModeContext);
  const router = useRouter();
  const [publication, setPublication] = useState(source.publication ?? 'inherit');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const label = `Public Lore access for ${source.title ?? source.fileName ?? 'source'}`;
  async function save() {
    if (editingBlocked || saving || source.status !== 'approved') return;
    setSaving(true);
    setMessage('');
    try {
      const result = await setSourcePublicationAction({ sourceId: source.id, publication, expectedUpdatedAt: source.updatedAt ?? null });
      setMessage(result.success ? 'Publication decision saved.' : result.error ?? 'Could not save. Reload and try again.');
      if (result.success) router.refresh();
    } catch { setMessage('Could not confirm the decision. Reload before trying again.'); }
    finally { setSaving(false); }
  }
  return <div className="space-y-2 rounded-lg border border-black/10 p-3 text-sm text-foreground dark:border-white/15">
    <label className="block" htmlFor={`publication-${source.id}`}>{label}</label>
    <div className="flex flex-wrap items-center gap-2">
      <select id={`publication-${source.id}`} value={publication} onChange={event => setPublication(event.target.value)} disabled={saving || editingBlocked}
        className="min-h-11 rounded border border-input bg-background px-3 text-foreground">
        <option value="inherit">Keep existing claim-based access</option>
        <option value="public">Publish even before artist claims</option>
        <option value="private">Exclude from public Lore and chat</option>
      </select>
      <Button type="button" variant="outline" disabled={saving || editingBlocked || publication === (source.publication ?? 'inherit')} onClick={() => void save()}>{saving ? 'Saving…' : 'Save publication'}</Button>
    </div>
    <p className="text-xs text-muted-foreground">Publishing permits public reading and chat use of this source. Excluding it does not revoke existing file URLs or erase previously generated text. Artist ownership and onboarding stay unchanged.</p>
    <p role="status" className="text-xs">{message}</p>
  </div>;
}
