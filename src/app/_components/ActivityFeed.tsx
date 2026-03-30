"use client"

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

// --- Types ----------------------------------------------------------------

type ActivityEvent = {
    type: "agent_mapping" | "ugc_approved" | "artist_added";
    artistId: string;
    artistName: string;
    platform: string | null;
    createdAt: string;
};

const MAX_ITEMS = 15;
const POLL_INTERVAL = 30_000;

// --- Helpers --------------------------------------------------------------

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
}

function platformLabel(raw: string | null): string {
    if (!raw) return "";
    const labels: Record<string, string> = {
        deezer: "Deezer",
        apple_music: "Apple Music",
        musicbrainz: "MusicBrainz",
        wikidata: "Wikidata",
        tidal: "Tidal",
        amazon_music: "Amazon Music",
        youtube_music: "YouTube Music",
        youtube: "YouTube",
        bandcamp: "Bandcamp",
        soundcloud: "SoundCloud",
        instagram: "Instagram",
        twitter: "Twitter",
    };
    return labels[raw] ?? raw;
}

function eventText(e: ActivityEvent): React.ReactNode {
    switch (e.type) {
        case "agent_mapping":
            return <>{platformLabel(e.platform)} ID mapped for <strong>{e.artistName}</strong></>;
        case "ugc_approved":
            return <>{platformLabel(e.platform)} link added for <strong>{e.artistName}</strong></>;
        case "artist_added":
            return <><strong>{e.artistName}</strong> added to the directory</>;
    }
}

function eventKey(e: ActivityEvent): string {
    return `${e.type}-${e.artistId}-${e.platform}-${e.createdAt}`;
}

// --- Theme CSS custom properties ------------------------------------------

const feedThemeVars = `
    .feed-root {
        --feed-body: #5a4d5e;
        --feed-body-hover: #3d2f42;
        --feed-artist: #ff9ce3;
        --feed-timestamp: #9b8a9f;
        --feed-timestamp-dim: rgba(155, 138, 159, 0.4);
        --feed-live-dot: #059669;
        --feed-live-label: rgba(90, 77, 94, 0.6);
        --feed-bar-agent: #0891b2;
        --feed-bar-ugc: #c44a8c;
        --feed-bar-new: #059669;
        --feed-hover-bg: rgba(90, 77, 94, 0.07);
        --feed-fresh-bg: rgba(5, 150, 105, 0.06);
        --feed-fresh-time: rgba(5, 150, 105, 0.7);
        --feed-empty: rgba(90, 77, 94, 0.35);
    }

    .feed-root strong {
        color: var(--feed-artist);
        font-weight: 600;
    }

    .feed-root .group:hover .feed-text {
        color: var(--feed-body-hover);
    }

    .feed-root .group:hover .feed-ts {
        color: var(--feed-timestamp);
    }

    .dark .feed-root {
        --feed-body: #c6bfc7;
        --feed-body-hover: #e0d8e2;
        --feed-artist: #ff9ce3;
        --feed-timestamp: rgba(198, 191, 199, 0.35);
        --feed-timestamp-dim: rgba(198, 191, 199, 0.25);
        --feed-live-dot: #19ffb8;
        --feed-live-label: rgba(198, 191, 199, 0.6);
        --feed-bar-agent: #2ad4fc;
        --feed-bar-ugc: #ff9ce3;
        --feed-bar-new: #19ffb8;
        --feed-hover-bg: rgba(198, 191, 199, 0.08);
        --feed-fresh-bg: rgba(25, 255, 184, 0.06);
        --feed-fresh-time: rgba(25, 255, 184, 0.7);
        --feed-empty: rgba(198, 191, 199, 0.3);
    }
`;

const typeBarVar: Record<ActivityEvent["type"], string> = {
    agent_mapping: "var(--feed-bar-agent)",
    ugc_approved: "var(--feed-bar-ugc)",
    artist_added: "var(--feed-bar-new)",
};

// --- Component ------------------------------------------------------------

export default function ActivityFeed() {
    const [events, setEvents] = useState<ActivityEvent[]>([]);
    const [, setTick] = useState(0);
    const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
    // Track initial load so we can animate the first batch in with stagger
    const [initialLoad, setInitialLoad] = useState(true);
    const latestTimestamp = useRef<string | null>(null);

    const fetchEvents = useCallback(async (since?: string) => {
        try {
            const url = since
                ? `/api/activity?since=${encodeURIComponent(since)}`
                : "/api/activity";
            const res = await fetch(url);
            if (!res.ok) return;
            const data: ActivityEvent[] = await res.json();
            return data;
        } catch {
            return undefined;
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchEvents().then((data) => {
            if (!data?.length) return;
            setEvents(data);
            latestTimestamp.current = data[0].createdAt;
            // Clear initial load flag after stagger animation completes
            setTimeout(() => setInitialLoad(false), data.length * 30 + 300);
        });
    }, [fetchEvents]);

    // Poll for new events every 30s
    useEffect(() => {
        const interval = setInterval(async () => {
            const since = latestTimestamp.current ?? undefined;
            const newEvents = await fetchEvents(since);
            if (!newEvents?.length) return;

            const newKeys = newEvents.map(eventKey);
            setFreshIds((prev) => {
                const next = new Set(prev);
                newKeys.forEach((k) => next.add(k));
                return next;
            });
            setTimeout(() => {
                setFreshIds((prev) => {
                    const next = new Set(prev);
                    newKeys.forEach((k) => next.delete(k));
                    return next;
                });
            }, 3000);

            setEvents((prev) =>
                [...newEvents, ...prev].slice(0, MAX_ITEMS),
            );
            latestTimestamp.current = newEvents[0].createdAt;
        }, POLL_INTERVAL);

        return () => clearInterval(interval);
    }, [fetchEvents]);

    // Update relative timestamps every 30s
    useEffect(() => {
        const interval = setInterval(() => setTick((t) => t + 1), POLL_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: feedThemeVars }} />
            <div className="feed-root flex flex-col items-center w-full px-2 sm:px-4">
                <div className="w-full max-w-xl">
                    {/* Live indicator */}
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                                style={{ backgroundColor: 'var(--feed-live-dot)' }} />
                            <span className="relative inline-flex rounded-full h-2 w-2"
                                style={{ backgroundColor: 'var(--feed-live-dot)' }} />
                        </span>
                        <span className="text-[10px] tracking-[0.2em] uppercase font-medium"
                            style={{ color: 'var(--feed-live-label)' }}>
                            Live
                        </span>
                    </div>

                    {/* Always render <ul> so aria-live is present from mount */}
                    <ul aria-live="polite" aria-label="Recent activity">
                        {events.length === 0 ? (
                            <li className="text-sm text-center py-6 list-none"
                                style={{ color: 'var(--feed-empty)' }}>
                                Waiting for activity...
                            </li>
                        ) : (
                            events.map((e, i) => {
                                const key = eventKey(e);
                                const isFresh = freshIds.has(key);
                                const shouldAnimate = initialLoad || isFresh;
                                const opacity = Math.max(0.45, 1 - i * 0.035);

                                return (
                                    <li
                                        key={key}
                                        className={shouldAnimate ? "animate-fadeSlideIn" : ""}
                                        style={{
                                            ...(shouldAnimate && initialLoad
                                                ? { animationDelay: `${i * 30}ms` }
                                                : {}),
                                            opacity,
                                        }}
                                    >
                                        <Link
                                            href={`/artist/${e.artistId}`}
                                            className="group flex items-center gap-2.5 py-[5px] px-2 sm:px-3 rounded-md
                                                       transition-all duration-300 hover:bg-[var(--feed-hover-bg)]"
                                            style={{
                                                backgroundColor: isFresh
                                                    ? 'var(--feed-fresh-bg)'
                                                    : 'transparent',
                                            }}
                                        >
                                            <span
                                                className="flex-shrink-0 w-[3px] h-4 rounded-full transition-all duration-300
                                                           group-hover:h-5"
                                                style={{ backgroundColor: typeBarVar[e.type] }}
                                            />
                                            <span className="feed-text text-[13px] truncate flex-1
                                                             transition-colors duration-300"
                                                style={{ color: 'var(--feed-body)' }}
                                            >
                                                {eventText(e)}
                                            </span>
                                            <span className="feed-ts text-[11px] flex-shrink-0 tabular-nums transition-colors duration-300"
                                                style={{
                                                    color: isFresh
                                                        ? 'var(--feed-fresh-time)'
                                                        : 'var(--feed-timestamp-dim)',
                                                }}
                                            >
                                                {relativeTime(e.createdAt)}
                                            </span>
                                        </Link>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>
            </div>
        </>
    );
}
