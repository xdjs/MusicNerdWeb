'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type HistoryPage = {
    entries: { id: string; artistId: string; artistName: string | null; siteName: string;
        oldValue: string | null; newValue: string; createdAt: string }[];
    total: number;
    page: number;
    pageCount: number;
};

export default function SelfEditHistory() {
    const [page, setPage] = useState(1);
    const [attempt, setAttempt] = useState(0);
    const [data, setData] = useState<HistoryPage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(false);
        async function load() {
            try {
                const response = await fetch(`/api/selfEdits?page=${page}`, { signal: controller.signal, cache: 'no-store' });
                if (!response.ok) throw new Error('History unavailable');
                const result: HistoryPage = await response.json();
                if (!controller.signal.aborted) setData(result);
            } catch {
                if (!controller.signal.aborted) setError(true);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }
        void load();
        return () => controller.abort();
    }, [page, attempt]);

    return (
        <section aria-labelledby="self-edit-history-title" className="mx-auto mt-8 w-full max-w-3xl rounded-xl border border-border p-4 sm:p-6 text-left">
            <h2 id="self-edit-history-title" className="text-lg font-semibold text-foreground">Your profile edits</h2>
            <p className="mt-1 text-sm text-muted-foreground">Changes to your claimed artist profiles. No leaderboard credit.</p>
            <div aria-live="polite" aria-busy={loading} className="mt-4">
                {loading ? <p className="text-sm text-muted-foreground">Loading profile edits…</p> : error ? (
                    <div role="alert" className="space-y-2">
                        <p>Unable to load profile edits.</p>
                        <Button variant="outline" size="sm" onClick={() => setAttempt(value => value + 1)}>Try again</Button>
                    </div>
                ) : data?.entries.length ? (
                    <ul className="divide-y divide-border">
                        {data.entries.map(entry => (
                            <li key={entry.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                                <div className="min-w-0">
                                    <Link href={`/artist/${entry.artistId}`} className="break-words font-medium text-foreground hover:underline">{entry.artistName ?? 'Artist'}</Link>
                                    <p className="break-words text-sm text-muted-foreground">{entry.oldValue === null ? 'Added' : 'Updated'} {entry.siteName} link</p>
                                </div>
                                <time dateTime={entry.createdAt} className="shrink-0 text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</time>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-muted-foreground">No profile edits yet.</p>}
            </div>
            {!error && data && data.pageCount > 1 && (
                <nav aria-label="Profile edit history pages" className="mt-4 flex items-center justify-end gap-3">
                    <Button variant="outline" size="sm" aria-label="Previous edits" disabled={loading || data.page <= 1} onClick={() => setPage(data.page - 1)}>Previous</Button>
                    <span className="text-sm text-muted-foreground">{data.page} / {data.pageCount}</span>
                    <Button variant="outline" size="sm" aria-label="Next edits" disabled={loading || data.page >= data.pageCount} onClick={() => setPage(data.page + 1)}>Next</Button>
                </nav>
            )}
        </section>
    );
}
