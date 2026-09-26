"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { LeaderboardEntry } from "@/server/utils/queries/leaderboardTypes";
import styles from "@/components/community/Community.module.css";

type RecentItem = { ugcId: string; artistId: string | null; artistName: string | null; imageUrl: string | null };

export default function LeaderboardRow({ entry, rank, current }: { entry: LeaderboardEntry; rank: number | null; current: boolean }) {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<RecentItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const name = entry.username || (entry.wallet ? `${entry.wallet.slice(0, 6)}…${entry.wallet.slice(-4)}` : 'Music nerd');
  const panelId = `recent-artists-${entry.userId}`;
  async function loadRecent() {
    setLoading(true); setError(false);
    try {
      const response = await fetch(`/api/recentEdited?userId=${encodeURIComponent(entry.userId)}`);
      if (!response.ok) throw new Error('Recent edits unavailable');
      setRecent(await response.json());
    } catch { setError(true); }
    finally { setLoading(false); }
  }
  return <li className={styles.row} data-podium={rank !== null && rank <= 3 ? 'true' : 'false'} data-current={current} id={current ? 'leaderboard-current-user' : undefined}>
    <button type="button" className={styles.rowButton} aria-label={`Recent artists for ${name}`} aria-expanded={open} aria-controls={panelId} onClick={() => { setOpen(!open); if (!open && !recent && !loading) void loadRecent(); }}>
      <span className={styles.person}>
        <span className={styles.rank} aria-label={rank ? `Rank ${rank}` : 'Unranked'}>{rank ?? '—'}</span>
        <span className={styles.avatar} aria-hidden="true">{name.slice(0, 2).toUpperCase()}</span>
        <span className="min-w-0"><span className={`block ${styles.personName}`}>{name}</span><span className="block text-xs text-muted-foreground mt-1">{entry.isHidden ? 'Unranked' : rank === 1 ? 'Leading this period' : current ? 'You' : 'Contributor'}</span></span>
      </span>
      <span className={styles.count}>{Number(entry.ugcCount).toLocaleString()}<span className={styles.mobileLabel}>links</span></span>
      <span className={styles.count}>{Number(entry.artistsCount).toLocaleString()}<span className={styles.mobileLabel}>artists added</span></span>
      <ChevronDown size={16} aria-hidden="true" className={open ? 'rotate-180' : ''} />
    </button>
    {open && <div id={panelId} className={styles.recent}>
      <h3 className="text-xs font-medium text-muted-foreground">Recent artists they’ve helped</h3>
      {loading && <p role="status" className="mt-3 text-sm">Loading artists…</p>}
      {error && <p role="alert" className="mt-3 text-sm">Recent artists couldn’t load. <button className="underline" onClick={() => void loadRecent()}>Retry recent artists</button></p>}
      {!loading && !error && recent && (recent.length ? <ul>{recent.map(item => <li key={item.ugcId}>{item.artistId ? <Link href={`/artist/${item.artistId}`}><img src={item.imageUrl || '/default_pfp_pink.png'} alt="" /><span>{item.artistName || 'Unknown artist'}</span></Link> : <span className="text-sm">{item.artistName || 'Artist unavailable'}</span>}</li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">No recent artist edits to show.</p>)}
    </div>}
  </li>;
}
