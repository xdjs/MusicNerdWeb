"use client";

import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "@/app/actions/serverActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Jazzicon from "react-jazzicon";
import { jsNumberForAddress } from "react-jazzicon";
import { createPublicClient, http } from "viem";
import { getEnsAvatar, getEnsName } from "viem/ens";
import { mainnet } from "wagmi/chains";

type RangeKey = "today" | "week" | "month" | "all";

type RecentItem = {
    ugcId: string;
    artistId: string | null;
    artistName: string | null;
    updatedAt: string | null;
    imageUrl: string | null;
};

const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(),
});

function LeaderboardRow({ entry, rank, highlightIdentifier }: { entry: LeaderboardEntry; rank: number | null; highlightIdentifier?: string }) {
    const [recent, setRecent] = useState<RecentItem[] | null>(null);
    const [loadingRec, setLoadingRec] = useState(false);

    // Avatar state for each leaderboard entry (replicates corner icon logic)
    const [ensAvatarUrl, setEnsAvatarUrl] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState(false);
    const [jazziconSeed, setJazziconSeed] = useState<number | null>(null);
    const [ensLoading, setEnsLoading] = useState(false);

    const identifierLc = highlightIdentifier?.toLowerCase();
    const isHighlighted = identifierLc && (
        entry.wallet?.toLowerCase() === identifierLc ||
        (entry.username ?? '').toLowerCase() === identifierLc ||
        (entry.email ?? '').toLowerCase() === identifierLc
    );
    const isPodium = !!rank && rank <= 3 && !entry.isHidden;

    useEffect(() => {
        let cancelled = false;
        async function resolveAvatar() {
            setEnsLoading(true);
            setAvatarError(false);
            try {
                const ensName = await getEnsName(publicClient, { address: entry.wallet as `0x${string}` });
                let finalAvatar: string | null = null;
                if (ensName) {
                    finalAvatar = await getEnsAvatar(publicClient, { name: ensName });
                }
                if (!cancelled) {
                    setEnsAvatarUrl(finalAvatar ?? null);
                    setJazziconSeed(finalAvatar ? null : jsNumberForAddress(entry.wallet));
                }
            } catch {
                if (!cancelled) {
                    setEnsAvatarUrl(null);
                    setJazziconSeed(jsNumberForAddress(entry.wallet));
                }
            } finally {
                if (!cancelled) setEnsLoading(false);
            }
        }
        resolveAvatar();
        return () => { cancelled = true; };
    }, [entry.wallet]);

    async function fetchRecent() {
        if (recent || loadingRec) return;
        setLoadingRec(true);
        try {
            const resp = await fetch(`/api/recentEdited?userId=${entry.userId}`);
            if (resp.ok) {
                const data = await resp.json();
                setRecent(data);
            }
        } catch (e) {
            console.error('Error fetching recent edits for user', e);
        } finally {
            setLoadingRec(false);
        }
    }

    const [showRecent, setShowRecent] = useState(false);

    return (
        <div
            data-podium={isPodium ? "true" : "false"}
            id={isHighlighted ? "leaderboard-current-user" : undefined}
            onMouseEnter={() => { setShowRecent(true); fetchRecent(); }}
            onMouseLeave={() => setShowRecent(false)}
                         className={cn(
                         "p-3 rounded-md transition-colors scroll-mt-12 hover:bg-[#f3f4f6] bg-white border-2",
                                                  isHighlighted
                              ? "border-4 border-[#ff9ce3] sticky top-12 z-10 shadow-[0_0_40px_rgba(255,156,227,0.6)]"
                              : "border-[#c6bfc7]"
                     )}
        >
            {/* Mobile layout */}
            <div className="flex flex-col sm:hidden space-y-3 p-4">
                {/* Top row: Rank, Profile Picture, Username */}
                <div className="flex items-center gap-4">
                    {/* Rank */}
                    <span className={`w-8 h-7 flex items-center justify-end flex-none font-semibold text-right text-muted-foreground ${rank && rank <= 3 ? 'text-2xl' : 'text-sm'}`}>
                        {entry.isHidden ? 'N/A' : (
                            rank === 1 ? <span className="relative left-[2px] top-[1px] inline-block">🥇</span>
                            : rank === 2 ? <span className="relative left-[2px] top-[1px] inline-block">🥈</span>
                            : rank === 3 ? <span className="relative left-[2px] top-[1px] inline-block">🥉</span>
                            : <span className="relative left-[-10px] top-[1px] inline-block">{rank}</span>
                        )}
                    </span>
                    {/* Profile Picture */}
                    <div className="w-10 h-10 flex-none rounded-full overflow-hidden flex items-center justify-center">
                        {ensLoading ? (
                            <img className="w-6 h-6" src="/spinner.svg" alt="Loading..." />
                        ) : ensAvatarUrl && !avatarError ? (
                            <img
                                src={ensAvatarUrl}
                                alt="ENS Avatar"
                                className="w-full h-full object-cover"
                                onError={() => setAvatarError(true)}
                            />
                        ) : jazziconSeed ? (
                            <Jazzicon diameter={40} seed={jazziconSeed} />
                        ) : (
                            <img
                                src="/default_pfp_pink.png"
                                alt="Default Profile"
                                className="w-full h-full object-cover"
                            />
                        )}
                    </div>
                    {/* Username */}
                    <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-lg">
                            {entry.username || entry.wallet.slice(0, 8) + "..."}
                        </p>
                    </div>
                </div>

                {/* UGC row */}
                <div className="flex justify-between items-center">
                    <span className="text-[#6f4b75] font-semibold text-base">UGC Added</span>
                    <Badge className="bg-[#f3f4f6] text-[#6f4b75] px-4 py-2 text-base rounded-full">
                        {entry.ugcCount}
                    </Badge>
                </div>

                {/* Artists row */}
                <div className="flex justify-between items-center">
                    <span className="text-[#6f4b75] font-semibold text-base">Artists Added</span>
                    <Badge className="bg-[#f3f4f6] text-[#6f4b75] px-4 py-2 text-base rounded-full">
                        {entry.artistsCount}
                    </Badge>
                </div>
            </div>

                    {/* Desktop layout */}
                    <div className="hidden sm:grid grid-cols-3 items-center">
                        {/* User col (left-aligned, with increased inner gap) */}
                        <div className="flex items-center gap-6 overflow-hidden">
                            <span className={`w-7 h-6 flex items-center justify-end flex-none font-semibold text-right text-muted-foreground ${rank && rank <= 3 ? 'text-2xl' : 'text-sm'}`}>
                                {entry.isHidden ? 'N/A' : (
                                    rank === 1 ? <span className="relative left-[2px] top-[1px] inline-block">🥇</span>
                                    : rank === 2 ? <span className="relative left-[2px] top-[1px] inline-block">🥈</span>
                                    : rank === 3 ? <span className="relative left-[2px] top-[1px] inline-block">🥉</span>
                                    : <span className="relative left-[-10px] top-[1px] inline-block">{rank}</span>
                                )}
                            </span>
                            {/* Consistent left padding before avatar to push name right */}
                            <div className="w-5 flex-none" />
                            {/* Avatar between rank and username */}
                            <div className="w-8 h-8 flex-none rounded-full overflow-hidden flex items-center justify-center">
                                {ensLoading ? (
                                    <img className="w-5 h-5" src="/spinner.svg" alt="Loading..." />
                                ) : ensAvatarUrl && !avatarError ? (
                                    <img
                                        src={ensAvatarUrl}
                                        alt="ENS Avatar"
                                        className="w-full h-full object-cover"
                                        onError={() => setAvatarError(true)}
                                    />
                                ) : jazziconSeed ? (
                                    <Jazzicon diameter={32} seed={jazziconSeed} />
                                ) : (
                                    <img
                                        src="/default_pfp_pink.png"
                                        alt="Default Profile"
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate text-lg">
                                    {entry.username || entry.wallet.slice(0, 8) + "..."}
                                </p>
                            </div>
                        </div>

                        {/* UGC count */}
                        <div className="flex items-center justify-center">
                            <Badge className="bg-[#f3f4f6] text-[#6f4b75] px-3 py-1.5 text-base rounded-full">
                                {entry.ugcCount}
                            </Badge>
                        </div>

                        {/* Artist count */}
                        <div className="flex items-center justify-end">
                            <Badge className="bg-[#f3f4f6] text-[#6f4b75] px-3 py-1.5 text-base rounded-full">
                                {entry.artistsCount}
                            </Badge>
                        </div>
                    </div>

                    {/* Recently Added Artists inline expansion */}
                    {showRecent && (
                        <div className="mt-4">
                            <p className="font-semibold text-center mb-2">{(entry.username || entry.email || entry.wallet.slice(0,8)+"...")}&#39;s Recently Edited</p>
                            {loadingRec && <p className="text-sm text-muted-foreground text-center">Loading...</p>}
                            {recent && recent.length ? (
                                <ul className="grid grid-cols-3 gap-4 justify-items-center">
                                    {recent.map(r => (
                                        <li key={r.artistId ?? r.ugcId} className="w-full flex flex-col items-center">
                                            <Link href={`/artist/${r.artistId ?? ''}`} className="flex flex-col items-center gap-1 hover:underline w-full">
                                                <img src={r.imageUrl || "/default_pfp_pink.png"} alt="artist" className="h-10 w-10 rounded-full object-cover" />
                                                <span className="text-xs truncate max-w-[80px] text-center">{r.artistName ?? 'Unknown Artist'}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : !loadingRec ? (
                                <p className="text-sm text-muted-foreground text-center">No recent artists</p>
                            ) : null}
                        </div>
                    )}
                </div>
        );
}

export default function Leaderboard({ highlightIdentifier, onRangeChange }: { highlightIdentifier?: string; onRangeChange?: (range: RangeKey) => void }) {
    const PER_PAGE = 10;
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showTopBtn, setShowTopBtn] = useState(false);
    const [range, setRange] = useState<RangeKey>("today");
    const [page, setPage] = useState(1);
    const [pageCount, setPageCount] = useState(1);

    // Notify parent whenever the range changes (including initial mount)
    useEffect(() => {
        onRangeChange?.(range);
    }, [range, onRangeChange]);

    function getRangeDates(r: RangeKey) {
        const now = new Date();
        switch (r) {
            case "today":
                const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                return { from: startToday, to: now };
            case "week":
                const weekAgo = new Date(now);
                weekAgo.setDate(now.getDate() - 7);
                return { from: weekAgo, to: now };
            case "month":
                const monthAgo = new Date(now);
                monthAgo.setMonth(now.getMonth() - 1);
                return { from: monthAgo, to: now };
            default:
                return null;
        }
    }

    function buildUrl() {
        const params = new URLSearchParams();
        const dates = getRangeDates(range);
        if (dates) {
            params.set("from", dates.from.toISOString());
            params.set("to", dates.to.toISOString());
        }
        params.set("page", page.toString());
        params.set("perPage", PER_PAGE.toString());
        return `/api/leaderboard?${params.toString()}`;
    }

    useEffect(() => {
        async function fetchLeaderboard() {
            if ((getRangeDates(range)?.from && !getRangeDates(range)?.to) || (!getRangeDates(range)?.from && getRangeDates(range)?.to)) {
                setLeaderboard([]);
                return;
            }
            try {
                setLoading(true);
                setError(null);
                const response = await fetch(buildUrl());
                if (!response.ok) {
                    throw new Error('Failed to fetch leaderboard');
                }
                const data = await response.json();
                if (Array.isArray(data)) {
                    // legacy response (no pagination)
                    setLeaderboard(data);
                    setPageCount(1);
                } else {
                    setLeaderboard(data.entries);
                    setPageCount(data.pageCount ?? 1);
                }
            } catch (err) {
                setError("Failed to load leaderboard");
                console.error("Error fetching leaderboard:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchLeaderboard();
    }, [range, page]);

    // Show/hide "back to top" button based on scroll position
    useEffect(() => {
        function handleScroll() {
            setShowTopBtn(window.scrollY > 400);
        }
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Reset to page 1 whenever range changes
    useEffect(() => {
        setPage(1);
    }, [range]);

    const headingLabelMap: Record<RangeKey, string> = {
        today: "Today",
        week: "Last Week",
        month: "Last Month",
        all: "All Time",
    };

    if (loading) {
        return (
            <Card className="max-w-3xl mx-auto shadow-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="mb-5 text-[#6f4b75]">Leaderboard</CardTitle>
                    {/* Range selector buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full mt-6 mb-4">
                        {(["today", "week", "month", "all"] as RangeKey[]).map((key) => (
                            <Button
                                key={key}
                                size="sm"
                                variant="outline"
                                className={cn(
                                    "w-full py-2 px-2 text-sm leading-tight sm:py-1 sm:text-[0.7rem] sm:text-sm border-2 font-bold",
                                    range === key
                                        ? "bg-pastypink text-white border-pastypink hover:bg-pastypink/90"
                                        : "bg-white text-pastypink border-pastypink hover:bg-gray-100"
                                )}
                                onClick={() => setRange(key)}
                            >
                                {range === key && <Check className="inline h-4 w-4 mr-1" />}
                                {headingLabelMap[key]}
                            </Button>
                        ))}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center gap-2">
                        <img className="w-4 h-4" src="/spinner.svg" alt="loading" />
                        <p className="text-center">Loading...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="max-w-3xl mx-auto shadow-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="mb-5 text-[#6f4b75]">Leaderboard</CardTitle>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full mt-6 mb-4">
                        {(["today", "week", "month", "all"] as RangeKey[]).map((key) => (
                            <Button
                                key={key}
                                size="sm"
                                variant="outline"
                                className={cn(
                                    "w-full py-2 px-2 text-sm leading-tight sm:py-1 sm:text-[0.7rem] sm:text-sm border-2 font-bold",
                                    range === key
                                        ? "bg-pastypink text-white border-pastypink hover:bg-pastypink/90"
                                        : "bg-white text-pastypink border-pastypink hover:bg-gray-100"
                                )}
                                onClick={() => setRange(key)}
                            >
                                {range === key && <Check className="inline h-4 w-4 mr-1" />}
                                {headingLabelMap[key]}
                            </Button>
                        ))}
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-red-500 text-center">{error}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <TooltipProvider delayDuration={200}>
        <Card className="max-w-3xl mx-auto shadow-2xl">
            <CardHeader className="text-center">
                <CardTitle className="mb-5 text-[#6f4b75]">Leaderboard</CardTitle>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full mt-6 mb-4">
                    {(["today", "week", "month", "all"] as RangeKey[]).map((key) => (
                        <Button
                            key={key}
                            size="sm"
                            variant="outline"
                            className={cn(
                                "w-full py-2 px-2 text-sm leading-tight sm:py-1 sm:text-[0.7rem] sm:text-sm border-2",
                                range === key
                                    ? "bg-pastypink text-white border-pastypink hover:bg-pastypink/90"
                                    : "bg-white text-pastypink border-pastypink hover:bg-gray-100"
                            )}
                            onClick={() => setRange(key)}
                        >
                            {range === key && <Check className="inline h-4 w-4 mr-1" />}
                            {headingLabelMap[key]}
                        </Button>
                    ))}
                </div>
            </CardHeader>
            <CardContent>
                {/* column headings (hidden on mobile) */}
                <div className="hidden sm:grid grid-cols-3 font-semibold text-base text-[#6f4b75] text-center sticky top-0 z-20 bg-white py-2 mb-2">
                    <span className="justify-self-start text-left">User</span>
                    <span>UGC Added</span>
                    <span className="justify-self-end text-right">Artists Added</span>
                </div>

                <div className="space-y-2">
                    {leaderboard.map((entry, index) => {
                        // Calculate rank for non-hidden users only
                        let calculatedRank: number | null = null;
                        if (!entry.isHidden) {
                            // Count non-hidden users before this entry
                            const nonHiddenBefore = leaderboard.slice(0, index).filter(e => !e.isHidden).length;
                            calculatedRank = (page - 1) * PER_PAGE + nonHiddenBefore + 1;
                        }
                        return (
                            <LeaderboardRow key={entry.userId} entry={entry} rank={calculatedRank} highlightIdentifier={highlightIdentifier} />
                        );
                    })}
                    {leaderboard.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                            No users have added artists yet. Be the first!
                        </p>
                    )}
                </div>
            </CardContent>
            {pageCount > 1 && (
                <div className="bg-white border-t flex justify-end items-center gap-4 p-3">
                    <Button
                        size="sm"
                        className={cn(
                            "py-1 px-2 text-[0.7rem] leading-tight sm:text-sm border-2",
                            page === 1
                                ? "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed"
                                : "bg-white text-pastypink border-pastypink hover:bg-gray-100"
                        )}
                        disabled={page === 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        Prev
                    </Button>
                    <span className="text-sm">Page {page} of {pageCount}</span>
                    <Button
                        size="sm"
                        className={cn(
                            "py-1 px-2 text-[0.7rem] leading-tight sm:text-sm border-2",
                            page >= pageCount
                                ? "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed"
                                : "bg-white text-pastypink border-pastypink hover:bg-gray-100"
                        )}
                        disabled={page >= pageCount}
                        onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    >
                        Next
                    </Button>
                </div>
            )}
        </Card>
        {showTopBtn && (
            <Button
                size="icon"
                variant="secondary"
                className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                aria-label="Back to top"
            >
                ↑
            </Button>
        )}
        </TooltipProvider>
    );
} 