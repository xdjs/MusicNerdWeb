"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { LeaderboardEntry } from "@/server/utils/queries/leaderboardTypes";
import LeaderboardRow from "./LeaderboardRow";
import surface from "./ProfileConcept.module.css";
import styles from "@/components/community/Community.module.css";

type RangeKey = 'today' | 'week' | 'month' | 'all';
const ranges: {key: RangeKey; label: string}[] = [{key:'today',label:'Today'},{key:'week',label:'Past week'},{key:'month',label:'Past month'},{key:'all',label:'All time'}];
const PER_PAGE = 10;

export default function Leaderboard({ currentUserId, highlightIdentifier, onRangeChange }: { currentUserId?: string; highlightIdentifier?: string; onRangeChange?: (range: RangeKey) => void }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [range, setRange] = useState<RangeKey>('today');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [jumpToOwn, setJumpToOwn] = useState(false);
  useEffect(() => {
    if (!jumpToOwn || loading) return;
    const row = document.getElementById('leaderboard-current-user');
    row?.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'center'});
    row?.querySelector('button')?.focus({preventScroll:true});
    setJumpToOwn(false);
  }, [jumpToOwn, loading, page]);
  useEffect(() => { onRangeChange?.(range); }, [range, onRangeChange]);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (range !== 'all') {
      const to = new Date();
      const from = new Date(to);
      if (range === 'today') from.setHours(0,0,0,0);
      if (range === 'week') from.setDate(from.getDate()-7);
      if (range === 'month') from.setMonth(from.getMonth()-1);
      params.set('from', from.toISOString()); params.set('to', to.toISOString());
    }
    setLoading(true); setError(false);
    void (async () => {
      try {
        const response = await fetch(`/api/leaderboard${params.size ? `?${params}` : ''}`, {signal:controller.signal});
        if (!response.ok) throw new Error('Leaderboard unavailable');
        const data = await response.json();
        if (!cancelled) setEntries(Array.isArray(data) ? data : data.entries);
      } catch { if (!cancelled) setError(true); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; controller.abort(); };
  }, [range, attempt]);
  const ranked = entries.filter(entry => !entry.isHidden);
  const own = currentUserId ? entries.find(entry => entry.userId === currentUserId) : undefined;
  const ownRank = own && !own.isHidden ? ranked.findIndex(entry => entry.userId === own.userId) + 1 : null;
  const pageCount = Math.max(1,Math.ceil(entries.length/PER_PAGE));
  const visiblePage = Math.min(page,pageCount);
  const visible = entries.slice((visiblePage-1)*PER_PAGE,visiblePage*PER_PAGE);
  return <section aria-label="Community rankings" className={styles.page}>
    <div className={styles.periodBar}>
      <div className={styles.filters} aria-label="Leaderboard period">{ranges.map(item => <button key={item.key} type="button" aria-pressed={range===item.key} className={`${styles.pill} ${range===item.key ? styles.selected : ''}`} onClick={() => { setPage(1); setRange(item.key); }}>{item.label}</button>)}</div>
      <span className="text-xs text-muted-foreground" aria-live="polite">{loading ? 'Updating…' : error ? 'Unavailable' : `${ranked.length.toLocaleString()} ${ranked.length===1?'contributor':'contributors'}`}</span>
    </div>
    {currentUserId && !loading && !error && <div className={`${surface.surface} ${styles.personal}`}>
      <div><h2 className="text-base font-semibold">Your contribution</h2><Link className="mt-2 inline-flex items-center gap-1 text-xs underline underline-offset-4" href="/profile">Your profile <ArrowUpRight size={13}/></Link></div>
      <dl><div><dt>Position</dt><dd>{own?.isHidden ? 'Unranked' : ownRank ? `#${ownRank}` : '—'}</dd></div><div><dt>Links shared</dt><dd>{Number(own?.ugcCount ?? 0).toLocaleString()}</dd></div><div><dt>Artists added</dt><dd>{Number(own?.artistsCount ?? 0).toLocaleString()}</dd></div></dl>
      {ownRank && <button className={styles.pill} aria-label="Show my position" onClick={() => { setPage(Math.floor(entries.findIndex(entry=>entry.userId===currentUserId)/PER_PAGE)+1); setJumpToOwn(true); }}>Find me</button>}
    </div>}
    <div className="flex items-baseline justify-between gap-4 mb-5"><h2 className="text-2xl font-semibold tracking-tight">The people behind the profiles</h2></div>
    <p className="text-sm text-muted-foreground mb-6 max-w-xl">Every artist added and link shared helps fans discover more. Open a contributor to see the artists they’ve helped.</p>
    {loading ? <div role="status" className={`${surface.surface} ${styles.state} rounded-2xl`}>Loading contributors…</div> : error ? <div role="alert" className={`${surface.surface} ${styles.state} rounded-2xl`}><p>The leaderboard couldn’t load.</p><button className={styles.pill} onClick={() => setAttempt(value=>value+1)}>Try again</button></div> : !entries.length ? <div className={`${surface.surface} ${styles.state} rounded-2xl`}><p className="font-semibold">No contributions in this period yet.</p><p className="text-sm text-muted-foreground">Help a fan find their next favorite artist.</p><Link href="/" className={styles.pill}>Explore artists</Link></div> : <>
      <div className={styles.listHead} aria-hidden="true"><span>Contributor</span><span>Links shared</span><span>Artists added</span><span/></div>
      <ol className={`${surface.surface} ${styles.list}`} start={(visiblePage-1)*PER_PAGE+1}>{visible.map(entry => <LeaderboardRow key={`${range}-${entry.userId}`} entry={entry} rank={entry.isHidden ? null : ranked.findIndex(item=>item.userId===entry.userId)+1} current={currentUserId ? entry.userId===currentUserId : !!highlightIdentifier && [entry.username,entry.wallet].some(value=>!!value && value.toLowerCase()===highlightIdentifier.toLowerCase())} />)}</ol>
      {pageCount>1 && <div className={styles.pagination}><button className={styles.pill} disabled={visiblePage===1} onClick={()=>setPage(visiblePage-1)}>Previous</button><span>Page {visiblePage} of {pageCount}</span><button className={styles.pill} disabled={visiblePage===pageCount} onClick={()=>setPage(visiblePage+1)}>Next</button></div>}
    </>}
    <p className="mt-6 text-xs text-muted-foreground leading-relaxed max-w-xl">Ranked by links shared and artists added in this period. Links include submissions awaiting review. Hidden contributors appear without a rank.</p>
  </section>;
}
