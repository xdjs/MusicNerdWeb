'use client';

import { useId, useState } from 'react';
import { ChevronDown, Copy, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { artistRequestEmail } from '@/lib/artist/artistRequestEmail';

export default function NonDspArtistRequest() {
  const id = useId();
  const [name, setName] = useState('');
  const [links, setLinks] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [showCopy, setShowCopy] = useState(false);
  const draft = artistRequestEmail(name, links);
  return <details className="group mt-5 border-t border-border pt-4 text-foreground">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">Don’t release on Spotify or Deezer?<ChevronDown aria-hidden className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"/></summary>
    <div className="mt-4 space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">Send us your music and profile links. We’ll review your request to add the artist.</p>
      <div><label htmlFor={`${id}-name`} className="mb-2 block text-sm">Artist name</label><Input id={`${id}-name`} value={name} onChange={event=>{setName(event.target.value);setCopyStatus('');}} placeholder="Artist or band name" maxLength={200} className="min-h-11 rounded-xl"/></div>
      <div><label htmlFor={`${id}-links`} className="mb-2 block text-sm">Music and profile links</label><textarea id={`${id}-links`} value={links} onChange={event=>{setLinks(event.target.value);setCopyStatus('');}} placeholder="Bandcamp, Subvert, your website…" maxLength={3000} rows={3} className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-pastypink"/></div>
      <Button asChild variant="pink" className="w-full"><a href={draft.href}><Mail size={16} aria-hidden/>Open email draft</a></Button>
      <p className="text-xs leading-relaxed text-muted-foreground">You’ll review and send the email to <span className="select-all">{draft.address}</span>. This won’t create a profile automatically.</p>
      <button type="button" className="inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4" onClick={async()=>{try{await navigator.clipboard.writeText(draft.copyText);setCopyStatus('Request copied. Paste it into your email app.');setShowCopy(false);}catch{setShowCopy(true);setCopyStatus('Select and copy the request below.');}}}><Copy size={14} aria-hidden/>No email app? Copy request</button>
      <p role="status" className="text-xs text-muted-foreground">{copyStatus}</p>
      {showCopy && <textarea aria-label="Request to copy" readOnly value={draft.copyText} rows={7} onFocus={event=>event.target.select()} className="w-full rounded-xl border border-input bg-background p-3 text-sm"/>}
    </div>
  </details>;
}
