"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpRight, Check, Clock, Search } from "lucide-react";

interface UserEntry {
  id: string;
  createdAt: string | null;
  artistName: string | null;
  siteName: string | null;
  ugcUrl: string | null;
  accepted: boolean | null;
}
const PER_PAGE = 10;

export default function UserEntriesTable() {
  const [entries, setEntries] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [site, setSite] = useState("all");
  const [status, setStatus] = useState("all");
  const [order, setOrder] = useState("newest");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    // The existing all=true endpoint lets filters/sorting cover the whole history.
    fetch('/api/userEntries?all=true', { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Unable to load contributions');
        const data = await response.json();
        if (!Array.isArray(data.entries)) throw new Error('Invalid contributions');
        if (!controller.signal.aborted) setEntries(data.entries);
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  const filtered = useMemo(() => entries.filter(entry =>
    (entry.artistName ?? '').toLowerCase().includes(query.trim().toLowerCase()) &&
    (site === 'all' || entry.siteName === site) &&
    (status === 'all' || (status === 'approved' ? entry.accepted : !entry.accepted))
  ).sort((a, b) => {
    const difference = (Date.parse(a.createdAt ?? '') || 0) - (Date.parse(b.createdAt ?? '') || 0);
    return order === 'oldest' ? difference : -difference;
  }), [entries, query, site, status, order]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const selectClass = 'h-10 rounded-full border border-border bg-background px-3 text-sm text-foreground';

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
        <h2 className="text-2xl font-semibold tracking-tight">Contribution history</h2>
        {!loading && !error && <span className="text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? 'contribution' : 'contributions'}</span>}
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
          <Input aria-label="Search contribution artists" placeholder="Search artists" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} className="rounded-full pl-9 text-base" />
        </div>
        <select aria-label="Contribution platform" value={site} className={selectClass} onChange={e => { setSite(e.target.value); setPage(1); }}>
          <option value="all">All platforms</option>
          {Array.from(new Set(entries.map(e => e.siteName).filter(Boolean))).sort().map(name => <option key={name} value={name!}>{name}</option>)}
        </select>
        <select aria-label="Contribution status" value={status} className={selectClass} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="all">All statuses</option><option value="approved">Approved</option><option value="pending">Pending</option>
        </select>
        <select aria-label="Contribution order" value={order} className={selectClass} onChange={e => { setOrder(e.target.value); setPage(1); }}>
          <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
        </select>
      </div>
      {loading ? <p role="status" className="py-8 text-muted-foreground">Loading contributions…</p> : error ? (
        <div role="alert" className="py-6"><p>Couldn’t load your contributions.</p><Button variant="outline" className="mt-3" onClick={() => setAttempt(a => a + 1)}>Try again</Button></div>
      ) : filtered.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(entry => {
            const date = entry.createdAt ? new Date(/Z|[+-]\d{2}:?\d{2}$/.test(entry.createdAt) ? entry.createdAt : `${entry.createdAt}Z`) : null;
            const validDate = date && !Number.isNaN(date.getTime());
            const safeUrl = entry.ugcUrl && /^https?:\/\//i.test(entry.ugcUrl) ? entry.ugcUrl : null;
            return <li key={entry.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-5 py-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted"><ArrowUpRight size={18} /></span>
              <div className="min-w-0 flex-1 basis-40">
                <p className="font-semibold break-words">{entry.artistName || 'Unknown artist'}</p>
                <p className="text-sm text-muted-foreground mt-1">{entry.siteName ? `${entry.siteName} link` : 'Link contribution'}{validDate && <> <span aria-hidden="true">·</span> <time dateTime={entry.createdAt!} title={date.toLocaleString()}>{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</time></>}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${entry.accepted ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/10 text-amber-800 dark:text-amber-300'}`}>
                {entry.accepted ? <Check size={13} /> : <Clock size={13} />}{entry.accepted ? 'Approved' : 'Pending'}
              </span>
              {safeUrl && <a href={safeUrl} target="_blank" rel="noopener noreferrer" aria-label={`View ${entry.siteName || 'submitted'} link for ${entry.artistName || 'artist'}`} className="inline-flex items-center gap-1 text-sm underline underline-offset-4">View link <ArrowUpRight size={14} /></a>}
            </li>;
          })}
        </ul>
      ) : <div className="py-10 text-muted-foreground">{entries.length ? 'No contributions match these filters.' : 'Your submitted artist links will appear here, with their review status.'}</div>}
      {pageCount > 1 && <div className="flex items-center justify-between gap-3 mt-5">
        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
        <span className="text-sm text-muted-foreground">{page} / {pageCount}</span>
        <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>}
    </div>
  );
}
