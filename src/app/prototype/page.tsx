"use client"

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// --- Mock data -----------------------------------------------------------

type ActivityEvent = {
    type: "agent_mapping" | "ugc_approved" | "artist_added";
    artistId: string;
    artistName: string;
    platform?: string;
    createdAt: string;
};

const MAX_ITEMS = 15;

function mockEvents(): ActivityEvent[] {
    const now = Date.now();
    const min = 60_000;
    const hr = 3_600_000;

    return [
        { type: "agent_mapping", artistId: "1", artistName: "Mogwai", platform: "deezer", createdAt: new Date(now - 2 * min).toISOString() },
        { type: "agent_mapping", artistId: "1", artistName: "Mogwai", platform: "apple_music", createdAt: new Date(now - 2.5 * min).toISOString() },
        { type: "ugc_approved", artistId: "2", artistName: "SENTO", platform: "youtube", createdAt: new Date(now - 5 * min).toISOString() },
        { type: "agent_mapping", artistId: "3", artistName: "Jodeci", platform: "deezer", createdAt: new Date(now - 12 * min).toISOString() },
        { type: "artist_added", artistId: "4", artistName: "Taylor Swift", createdAt: new Date(now - 1.2 * hr).toISOString() },
        { type: "agent_mapping", artistId: "5", artistName: "Lethal Bizzle", platform: "deezer", createdAt: new Date(now - 1.5 * hr).toISOString() },
        { type: "ugc_approved", artistId: "6", artistName: "Burial", platform: "bandcamp", createdAt: new Date(now - 2 * hr).toISOString() },
        { type: "agent_mapping", artistId: "7", artistName: "Four Tet", platform: "tidal", createdAt: new Date(now - 2.5 * hr).toISOString() },
        { type: "agent_mapping", artistId: "8", artistName: "Caribou", platform: "musicbrainz", createdAt: new Date(now - 3 * hr).toISOString() },
        { type: "artist_added", artistId: "9", artistName: "Floating Points", createdAt: new Date(now - 4 * hr).toISOString() },
        { type: "agent_mapping", artistId: "10", artistName: "Bonobo", platform: "amazon_music", createdAt: new Date(now - 5 * hr).toISOString() },
        { type: "ugc_approved", artistId: "11", artistName: "James Blake", platform: "soundcloud", createdAt: new Date(now - 6 * hr).toISOString() },
        { type: "agent_mapping", artistId: "12", artistName: "Aphex Twin", platform: "wikidata", createdAt: new Date(now - 8 * hr).toISOString() },
        { type: "agent_mapping", artistId: "13", artistName: "Squarepusher", platform: "youtube_music", createdAt: new Date(now - 10 * hr).toISOString() },
        { type: "artist_added", artistId: "14", artistName: "Jon Hopkins", createdAt: new Date(now - 12 * hr).toISOString() },
    ];
}

const incomingPool: Omit<ActivityEvent, "createdAt">[] = [
    { type: "agent_mapping", artistId: "15", artistName: "Amon Tobin", platform: "tidal" },
    { type: "ugc_approved", artistId: "16", artistName: "Kendrick Lamar", platform: "instagram" },
    { type: "agent_mapping", artistId: "17", artistName: "Radiohead", platform: "apple_music" },
    { type: "artist_added", artistId: "18", artistName: "Daft Punk" },
    { type: "agent_mapping", artistId: "19", artistName: "DJ Shadow", platform: "amazon_music" },
    { type: "ugc_approved", artistId: "20", artistName: "Tyler, the Creator", platform: "twitter" },
    { type: "agent_mapping", artistId: "21", artistName: "Massive Attack", platform: "wikidata" },
    { type: "agent_mapping", artistId: "22", artistName: "Portishead", platform: "musicbrainz" },
    { type: "artist_added", artistId: "23", artistName: "FKA twigs" },
    { type: "agent_mapping", artistId: "24", artistName: "Brian Eno", platform: "deezer" },
    { type: "ugc_approved", artistId: "25", artistName: "Bjork", platform: "bandcamp" },
    { type: "agent_mapping", artistId: "26", artistName: "Boards of Canada", platform: "youtube_music" },
];

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

function platformLabel(raw?: string): string {
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

// --- Theme-aware CSS custom properties ------------------------------------
// Defined once, consumed everywhere via var(--feed-*)

const feedThemeVars = `
    .feed-root {
        --feed-title: #ff9ce3;
        --feed-title-glow: rgba(255, 156, 227, 0.2);
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
        --feed-title: #ff9ce3;
        --feed-title-glow: rgba(255, 156, 227, 0.3);
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

export default function PrototypePage() {
    const [events, setEvents] = useState<ActivityEvent[]>([]);
    const [, setTick] = useState(0);
    const [nextIncoming, setNextIncoming] = useState(0);
    const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const timer = setTimeout(() => setEvents(mockEvents()), 300);
        return () => clearTimeout(timer);
    }, []);

    const addEvent = useCallback(() => {
        const template = incomingPool[nextIncoming % incomingPool.length];
        const newEvent: ActivityEvent = {
            ...template,
            artistId: `${template.artistId}-${Date.now()}`,
            createdAt: new Date().toISOString(),
        };

        const eventKey = `${newEvent.type}-${newEvent.artistId}-${newEvent.createdAt}`;
        setFreshIds((prev) => new Set(prev).add(eventKey));
        setTimeout(() => {
            setFreshIds((prev) => {
                const next = new Set(prev);
                next.delete(eventKey);
                return next;
            });
        }, 3000);

        setEvents((prev) => [newEvent, ...prev].slice(0, MAX_ITEMS));
        setNextIncoming((n) => n + 1);
    }, [nextIncoming]);

    useEffect(() => {
        if (events.length === 0) return;
        const delay = 4000 + Math.random() * 4000;
        const timer = setTimeout(addEvent, delay);
        return () => clearTimeout(timer);
    }, [events, addEvent]);

    useEffect(() => {
        const interval = setInterval(() => setTick((t) => t + 1), 30_000);
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: feedThemeVars }} />
            <div className="feed-root px-6 sm:px-8 pt-0 pb-4 flex flex-col items-center w-full !flex-grow-0">
                <div className="w-full max-w-2xl">
                    {/* Title */}
                    <div className="flex justify-center w-full px-4 -mt-2 mb-5">
                        <h1 className="lowercase font-bold"
                            style={{
                                fontSize: 'clamp(32px, calc(32px + (84 - 32) * ((100vw - 360px) / (1440 - 360))), 84px)',
                                letterSpacing: 'clamp(-1px, calc(-1px + (-4 - -1) * ((100vw - 360px) / (1440 - 360))), -4px)',
                                lineHeight: '1',
                                color: 'var(--feed-title)',
                                textShadow: '0 0 40px var(--feed-title-glow)',
                            }}
                        >
                            music nerd
                        </h1>
                    </div>

                    {/* Activity Feed */}
                    <div className="flex flex-col items-center w-full px-2 sm:px-4">
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

                            {events.length === 0 ? (
                                <div className="text-sm text-center py-6"
                                    style={{ color: 'var(--feed-empty)' }}>
                                    Waiting for activity...
                                </div>
                            ) : (
                                <ul>
                                    {events.map((e, i) => {
                                        const key = `${e.type}-${e.artistId}-${e.createdAt}`;
                                        const isFresh = freshIds.has(key);
                                        const opacity = Math.max(0.45, 1 - i * 0.035);

                                        return (
                                            <li
                                                key={key}
                                                className="animate-fadeSlideIn"
                                                style={{
                                                    animationDelay: `${i * 30}ms`,
                                                    opacity,
                                                }}
                                            >
                                                <Link
                                                    href={`/artist/${e.artistId}`}
                                                    className="group flex items-center gap-2.5 py-[5px] px-2 sm:px-3 rounded-md
                                                               transition-all duration-300"
                                                    style={{
                                                        backgroundColor: isFresh
                                                            ? 'var(--feed-fresh-bg)'
                                                            : 'transparent',
                                                    }}
                                                >
                                                    {/* Type indicator bar */}
                                                    <span
                                                        className="flex-shrink-0 w-[3px] h-4 rounded-full transition-all duration-300
                                                                   group-hover:h-5"
                                                        style={{ backgroundColor: typeBarVar[e.type] }}
                                                    />
                                                    {/* Event text */}
                                                    <span className="feed-text text-[13px] truncate flex-1
                                                                     transition-colors duration-300"
                                                        style={{ color: 'var(--feed-body)' }}
                                                    >
                                                        {eventText(e)}
                                                    </span>
                                                    {/* Timestamp */}
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
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
