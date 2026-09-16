"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, ArrowUpRight, Bookmark, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Result = { id: string; name: string; imageUrl?: string | null; isExternalOnly?: boolean };

export default function ShareLinkDialog({ open, onOpenChange, title = "Share a link", onBookmark, bookmarkedIds = [] }: { title?: string; open: boolean; onOpenChange: (open: boolean) => void; onBookmark?: (artist: Result) => void; bookmarkedIds?: string[] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  useEffect(() => {
    if (!open) { setQuery(''); return; }
    setResults([]);
    if (!query.trim()) { setStatus('idle'); return; }
    setStatus('loading');
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/searchArtists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: query.trim() }), signal: controller.signal });
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json() as { results: Result[] };
        if (controller.signal.aborted) return;
        setResults(data.results.filter(artist => artist.id && !artist.isExternalOnly));
        setStatus('ready');
      } catch {
        if (!controller.signal.aborted) setStatus('error');
      }
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, open]);

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="mn-themed-dialog artist-link-panel max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl border-white/15 bg-neutral-950/80 bg-gradient-to-br from-white/[0.08] via-transparent to-white/[0.02] p-5 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl backdrop-saturate-150 sm:rounded-2xl sm:p-6">
      <DialogHeader className="space-y-2 pr-7 text-left">
        <DialogTitle className="text-xl font-semibold leading-snug tracking-tight">{title}</DialogTitle>
        <DialogDescription className="text-sm leading-relaxed text-muted-foreground">{onBookmark ? "Search artists and bookmark your favorites here." : "Find the artist you’d like to contribute to."}</DialogDescription>
      </DialogHeader>
      <div className="relative">
        <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label={onBookmark ? "Search artists to bookmark" : "Search for an artist to share a link"} placeholder="Search for an artist…" value={query} onChange={event => setQuery(event.target.value)} className="min-h-12 rounded-xl border-pastypink/60 bg-white/[0.04] pl-10 text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-pastypink/30" />
      </div>
      <div aria-live="polite" className="text-sm text-muted-foreground">
        {status === 'loading' && 'Searching…'}
        {status === 'error' && 'Search couldn’t load. Try searching again.'}
        {status === 'ready' && !results.length && 'No artists found in MusicNerd. Try another name, or add the artist first.'}
      </div>
      {results.length > 0 && <ul className="divide-y divide-border">{results.map(artist => {
        const saved = bookmarkedIds.includes(artist.id);
        const identity = <span className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={artist.imageUrl || '/default_pfp_pink.png'} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" onError={event => { if (!event.currentTarget.src.endsWith('/default_pfp_pink.png')) event.currentTarget.src = '/default_pfp_pink.png'; }} />
          <span className="min-w-0 break-words font-medium">{artist.name}</span>
        </span>;
        return <li key={artist.id}>{onBookmark ? <div className="flex items-center justify-between gap-3 py-3">
          {identity}
          <Button type="button" variant="outline" disabled={saved} aria-label={`${saved ? 'Bookmarked' : 'Bookmark'} ${artist.name}`} className="shrink-0 rounded-full border-pastypink/40 bg-pastypink/10 text-foreground disabled:opacity-75" onClick={() => onBookmark(artist)}>
            {saved ? <Check size={15} className="mr-1.5" /> : <Bookmark size={15} className="mr-1.5" />}{saved ? 'Saved' : 'Bookmark'}
          </Button>
        </div> : <Link onClick={() => onOpenChange(false)} href={`/artist/${artist.id}#mn-links`} className="flex items-center justify-between gap-3 rounded-lg px-3 py-3 text-foreground hover:bg-pastypink/10 focus-visible:outline focus-visible:outline-pink-400">{identity}<ArrowUpRight size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" /></Link>}</li>;
      })}</ul>}
      {onBookmark ? <Button variant="outline" className="rounded-full justify-self-end" onClick={() => onOpenChange(false)}>Done</Button> : <p className="text-xs text-muted-foreground">Choose an artist, then select “Add a link” in their Links section.</p>}

    </DialogContent>
  </Dialog>;
}
