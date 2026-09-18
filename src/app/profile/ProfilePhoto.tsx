"use client";
import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';

export default function ProfilePhoto({ userId }: { userId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    setUrl(null);
    fetch('/api/user/profile-image', { signal: controller.signal, cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('Photo unavailable');
      const data = await response.json();
      if (!controller.signal.aborted) setUrl(data.url);
    }).catch(() => { if (!controller.signal.aborted) setMessage('Photo unavailable. You can retry by refreshing.'); });
    return () => controller.abort();
  }, [userId, revision]);

  return <div className="shrink-0 max-w-32">
    <button type="button" aria-label="Change profile photo" title="Change photo (JPG, PNG or WebP, up to 2 MB)" disabled={busy} onClick={() => input.current?.click()} className="relative block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ff75d8]">
      <img src={url || '/default_pfp_pink.png'} alt="Your profile photo" className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover" />
      <span className="absolute -bottom-1 -right-1 rounded-full bg-[#ff75d8] text-[#000] p-1.5"><Camera size={14} /></span>
    </button>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="Upload profile photo" onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = '';
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { setMessage('Choose an image smaller than 2 MB.'); return; }
      setBusy(true); setMessage('Saving photo…');
      try {
        const data = new FormData(); data.append('file', file);
        const response = await fetch('/api/user/profile-image', { method: 'POST', body: data });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not save photo');
        setRevision(r => r + 1); setMessage('Photo saved to your account.');
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save photo.'); }
      finally { setBusy(false); }
    }} />
    {message && <p role="status" className="mt-2 text-xs text-muted-foreground">{message}</p>}
  </div>;
}
