"use client";

import DatePicker from "./DatePicker";
import ProfilePhoto from "./ProfilePhoto";
import useBookmarkedArtistSummaries from "./useBookmarkedArtistSummaries";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { DateRange } from "react-day-picker";
import { getUgcStatsInRangeAction as getUgcStatsInRange } from "@/app/actions/serverActions";
import { User } from "@/server/db/DbTypes";
import UgcStatsWrapper from "./Wrapper";
import Leaderboard from "./Leaderboard";
import { Pencil, Check, ArrowDownCircle, Trash2, GripVertical, ChevronDown, ChevronUp, ArrowUpRight, Bookmark, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import SelfEditHistory from "./SelfEditHistory";
import UserEntriesTable from "./UserEntriesTable";
import LoadingPage from "../_components/LoadingPage";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type RecentItem = {
    ugcId: string;
    artistId: string | null;
    artistName: string | null;
    updatedAt: string | null;
    imageUrl: string | null;
};

type BookmarkItem = {
    artistId: string;
    artistName: string;
    imageUrl: string | null;
};

// Sortable bookmark item component
function SortableBookmarkItem({ item, isEditing, onDelete, bio }: {
    bio?: string;
    item: BookmarkItem;
    isEditing: boolean;
    onDelete: (artistId: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.artistId });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <li ref={setNodeRef} style={style} className="relative">
            <div className="relative group">
                {isEditing && (
                    <button
                        {...attributes}
                        {...listeners}
                        className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing rounded-full bg-background p-2 text-foreground"
                        title="Drag to reorder"
                        aria-label={`Reorder ${item.artistName}`}
                    >
                        <GripVertical size={16} />
                    </button>
                )}
                <Link href={`/artist/${item.artistId}`} className="block hover:underline underline-offset-4">
                    <img src={item.imageUrl || "/default_pfp_pink.png"} alt="" className="aspect-square w-full rounded-xl object-cover mb-3 bg-muted" />
                    <span className="block font-medium text-foreground truncate">{item.artistName ?? 'Unknown Artist'}</span>
                </Link>
                {!isEditing && <div className="mt-2 space-y-3">
                    {bio && <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{bio}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                        <Link href={`/artist/${item.artistId}#mn-latest`} className="underline underline-offset-4">Latest</Link>
                        <Link href={`/artist/${item.artistId}#mn-links`} className="underline underline-offset-4">Links</Link>
                    </div>
                </div>}
                {isEditing && (
                    <button
                        onClick={() => onDelete(item.artistId)}
                        className="absolute top-2 right-2 rounded-full bg-background p-2 text-red-600 hover:text-red-800"
                        title="Delete bookmark"
                        aria-label={`Remove ${item.artistName}`}
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        </li>
    );
}

export default function Dashboard({ user, showLeaderboard = true, allowEditUsername = false, showDateRange = true, hideLogin = false, showStatus = true, selectedRange }: { user: User; showLeaderboard?: boolean; allowEditUsername?: boolean; showDateRange?: boolean; hideLogin?: boolean; showStatus?: boolean; selectedRange?: "today" | "week" | "month" | "all" }) {
    return <UgcStatsWrapper><UgcStats user={user} showLeaderboard={showLeaderboard} allowEditUsername={allowEditUsername} showDateRange={showDateRange} hideLogin={hideLogin} showStatus={showStatus} selectedRange={selectedRange} /></UgcStatsWrapper>;
}

function UgcStats({ user, showLeaderboard = true, allowEditUsername = false, showDateRange = true, hideLogin = false, showStatus = true, selectedRange }: { user: User; showLeaderboard?: boolean; allowEditUsername?: boolean; showDateRange?: boolean; hideLogin?: boolean; showStatus?: boolean; selectedRange?: "today" | "week" | "month" | "all" }) {
    const [date, setDate] = useState<DateRange | undefined>();
    const [ugcStats, setUgcStats] = useState<{ ugcCount: number, artistsCount: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [allTimeStats, setAllTimeStats] = useState<{ ugcCount: number, artistsCount: number } | null>(null);
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [usernameInput, setUsernameInput] = useState(user.username ?? "");
    const [savingUsername, setSavingUsername] = useState(false);
    const [recentUGC, setRecentUGC] = useState<RecentItem[]>([]);
    const [rank, setRank] = useState<number | null>(null);
    // ----------- Bookmarks state & pagination -----------
    const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
    const [bookmarkPage, setBookmarkPage] = useState(0);
    const [isEditingBookmarks, setIsEditingBookmarks] = useState(false);
    const pageSize = 6;

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Handle drag end for reordering bookmarks
    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setBookmarks((items) => {
                const oldIndex = items.findIndex((item) => item.artistId === active.id);
                const newIndex = items.findIndex((item) => item.artistId === over?.id);

                if (oldIndex < 0 || newIndex < 0) return items;
                const newItems = arrayMove(items, oldIndex, newIndex);

                // Save to localStorage
                if (typeof window !== 'undefined') {
                    localStorage.setItem(`bookmarks_${user.id}`, JSON.stringify(newItems));
                }

                return newItems;
            });
        }
    }

    // Delete bookmark function
    function deleteBookmark(artistId: string) {
        if (!window.confirm('Remove this bookmark?')) return;

        const newBookmarks = bookmarks.filter(b => b.artistId !== artistId);
        setBookmarks(newBookmarks);
        if (typeof window !== 'undefined') {
            localStorage.setItem(`bookmarks_${user.id}`, JSON.stringify(newBookmarks));
        }

        // Notify other tabs/components
        window.dispatchEvent(new Event('bookmarksUpdated'));
    }

    // Save bookmarks function
    function saveBookmarks() {
        if (typeof window !== 'undefined') {
            localStorage.setItem(`bookmarks_${user.id}`, JSON.stringify(bookmarks));
            window.dispatchEvent(new Event('bookmarksUpdated'));
        }
        setIsEditingBookmarks(false);
    }

    useEffect(() => {
        // Load bookmarks from localStorage (placeholder until backend wiring)
        const load = () => {
            try {
                if (typeof window === 'undefined') return; // Skip on server side

                const raw = localStorage.getItem(`bookmarks_${user.id}`);
                if (raw) {
                    const parsed = JSON.parse(raw) as BookmarkItem[];
                    // Bookmarks are stored in most-recent-first order. No additional reversing needed.
                    setBookmarks(parsed);
                } else {
                    setBookmarks([]);
                }
            } catch (e) {
                console.debug('[Dashboard] unable to parse bookmarks from storage', e);
            }
        };

        load();

        const handleUpdate = () => load();
        window.addEventListener('bookmarksUpdated', handleUpdate);
        window.addEventListener('storage', handleUpdate);

        return () => {
            window.removeEventListener('bookmarksUpdated', handleUpdate);
            window.removeEventListener('storage', handleUpdate);
        };
    }, [user.id]);

    const totalBookmarkPages = Math.max(1, Math.ceil(bookmarks.length / pageSize));
    const visibleBookmarkPage = Math.min(bookmarkPage, totalBookmarkPages - 1);
    const currentBookmarks = bookmarks.slice(visibleBookmarkPage * pageSize, visibleBookmarkPage * pageSize + pageSize);
    // In edit mode, show the full list with a scrollbar (no pagination)
    const displayBookmarks = isEditingBookmarks ? bookmarks : currentBookmarks;
    const artistSummaries = useBookmarkedArtistSummaries(allowEditUsername ? currentBookmarks.map(item => item.artistId) : []);
    const isCompactLayout = !allowEditUsername; // compact (leaderboard-style) when username editing disabled

	    // Range selection (synced with Leaderboard)
    type RangeKey = "today" | "week" | "month" | "all";
    const [internalSelectedRange, setInternalSelectedRange] = useState<RangeKey>("today");
    const selectedRangeToUse = selectedRange || internalSelectedRange;

    // (duplicate RangeKey and selectedRange definition removed)

    // Fetch leaderboard rank (only in compact layout)
    const [totalEntries, setTotalEntries] = useState<number | null>(null);

    // Fetch the user's rank on the leaderboard. In the compact leaderboard view we
    // respect the currently-selected date range. In the full profile view we
    // always fetch the all-time leaderboard so the stat matches the "UGC Total"
    // values directly above it.
    useEffect(() => {
        async function fetchRank() {
            try {
                // Check if user is hidden first - if so, set rank to -1 and skip API call
                if (user.isHidden) {
                    setRank(-1);
                    setTotalEntries(null); // Don't show total for hidden users
                    return;
                }

                let url = '/api/leaderboard';
                // In full profile layout, always fetch all-time rank
                // In compact layout, respect the selected date range
                const dates = isCompactLayout ? getRangeDates(selectedRangeToUse) : null;
                if (dates) {
                    url = `/api/leaderboard?from=${encodeURIComponent(dates.from.toISOString())}&to=${encodeURIComponent(dates.to.toISOString())}`;
                }
                const resp = await fetch(url);
                if (!resp.ok) return;
                const data = await resp.json();

                // Handle both paginated and non-paginated responses
                const entries = Array.isArray(data) ? data : data.entries;

                // Exclude hidden users from total count
                const nonHiddenUsers = entries.filter((entry: any) => !entry.isHidden);
                setTotalEntries(nonHiddenUsers.length);

                const idx = entries.findIndex((entry: any) => entry.wallet?.toLowerCase() === user.wallet?.toLowerCase());

                if (idx !== -1) {
                    // Check if the current user is hidden - check both user object and leaderboard entry
                    const userEntry = entries[idx];
                    const isUserHidden = user.isHidden || userEntry?.isHidden;

                    if (isUserHidden) {
                        setRank(-1); // Use -1 to indicate hidden user
                    } else {
                        // Calculate rank among non-hidden users only
                        const nonHiddenIdx = nonHiddenUsers.findIndex((entry: any) => entry.wallet?.toLowerCase() === user.wallet?.toLowerCase());
                        if (nonHiddenIdx !== -1) {
                            setRank(nonHiddenIdx + 1);
                        }
                    }

                    // Set stats from leaderboard data to ensure consistency (only in compact layout)
                    if (userEntry && isCompactLayout) {
                        setUgcStats({
                            ugcCount: userEntry.ugcCount,
                            artistsCount: userEntry.artistsCount
                        });
                    }
                }
            } catch (e) {
                console.error('Error fetching rank', e);
            }
        }

        fetchRank();
    }, [selectedRangeToUse, user.wallet, isCompactLayout]);

    const isGuestUser = user.username === 'Guest User' || user.id === '00000000-0000-0000-0000-000000000000';
    const displayName = isGuestUser ? 'User Profile' : (user?.username || user?.email || user?.wallet);
    // Determine user status string for display (support multiple roles)
    const statusString = (() => {
        const roles: string[] = [];
        if (user.isAdmin) roles.push("Admin");
        if (user.isWhiteListed) roles.push("Whitelisted");
        if (roles.length === 0) roles.push("User");
        if (user.isHidden) roles.push("Hidden");
        return roles.join(", ");
    })();

    const { status } = useSession();

    // When the profile page mounts, record the current approved UGC count so the red dot is cleared.
    useEffect(() => {
        async function markUGCSeen() {
            try {
                const resp = await fetch('/api/ugcCount');
                if (!resp.ok) return;
                const data = await resp.json();

                const storageKey = `ugcCount_${user.id}`;
                if (typeof window !== 'undefined') {
                    localStorage.setItem(storageKey, String(data.count));
                }
                // Notify other tabs/components
                window.dispatchEvent(new Event('ugcCountUpdated'));
            } catch (e) {
                console.error('[Profile] Error marking UGC as seen', e);
            }
        }

        // Skip for guest users
        if (user.id && user.id !== '00000000-0000-0000-0000-000000000000') {
            markUGCSeen();
        }
    }, [user.id]);

    // Auto-refresh is now handled by LeaderboardAutoRefresh component
    // No need for duplicate logic here

    function handleLogin() {
        const navLoginBtn = document.getElementById("login-btn");
        if (navLoginBtn) {
            (navLoginBtn as HTMLButtonElement).click();
        }
    }

    async function checkUgcStats() {
        if (date?.from && date?.to) {
            setLoading(true);
            const result = await getUgcStatsInRange(date, null);
            if (result) {
                setUgcStats(result);
            }
            setLoading(false);
        }
    }

    async function saveUsername() {
        if (!usernameInput || usernameInput === user.username) {
            setIsEditingUsername(false);
            return;
        }
        setSavingUsername(true);
        try {
            const resp = await fetch(`/api/user/${user.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: usernameInput })
            });
            if (!resp.ok) {
                const data = await resp.json().catch(() => null);
                alert(data?.message || "Failed to update username");
                return;
            }
            const data = await resp.json();
            if (data.status === "success") {
                window.location.reload();
                return;
            }
            alert(data.message || "Failed to update username");
        } catch(e) {
            alert("Server error updating username");
        } finally {
            setSavingUsername(false);
            setIsEditingUsername(false);
        }
    }

    function getRangeDates(r: RangeKey) {
        const now = new Date();
        switch (r) {
            case "today":
                const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                return { from: startToday, to: now } as const;
            case "week":
                const weekAgo = new Date(now);
                weekAgo.setDate(now.getDate() - 7);
                return { from: weekAgo, to: now } as const;
            case "month":
                const monthAgo = new Date(now);
                monthAgo.setMonth(now.getMonth() - 1);
                return { from: monthAgo, to: now } as const;
            case "all":
                return null; // For "all" time, return null to get all-time data from API
            default:
                return null;
        }
    }

    // Fetch all-time stats **once** on mount. These counts remain static and are not affected by leaderboard range filters.
    useEffect(() => {
        async function fetchAllTimeStats() {
            try {
                const dateRange: DateRange = { from: new Date(0), to: new Date() } as DateRange;
                const result = await getUgcStatsInRange(dateRange, null);
                if (result) setAllTimeStats(result);
            } catch (e) {
                console.error('[Dashboard] Error fetching all-time UGC stats', e);
            }
        }

        fetchAllTimeStats();
    }, []);

    // Fetch stats for the currently selected leaderboard range (compact layout only)
    // This is now handled by the rank fetching useEffect below, which uses the same leaderboard data

    // Callback from Leaderboard to keep range in sync
    const handleLeaderboardRangeChange = (range: RangeKey) => {
        setInternalSelectedRange(range);
    };

    // Fetch recent edited UGC only for the full profile layout (not the compact leaderboard layout)
    useEffect(() => {
        if (!isCompactLayout) {
            fetch('/api/recentEdited')
                .then(res => res.json())
                .then((data: RecentItem[]) => setRecentUGC(data))
                .catch((e) => console.error('[Dashboard] error fetching recent edited', e));
        }
    }, [isCompactLayout]);

    // ------------------- RENDER -------------------

         // Show simplified "please log in" screen only on the full (non-compact) profile view.
     // In the compact leaderboard view we still want to show the stats box so we can
     // prompt the user to log in from there.
     if (isGuestUser && !isCompactLayout) {
         return (
             <section data-guest-user="true" className="px-10 py-20 space-y-8 flex items-center justify-center flex-col text-center">
                 <h1 className="text-4xl font-bold tracking-tight">Your corner of MusicNerd.</h1>
                 <p className="max-w-sm text-muted-foreground">Save the artists you care about and keep track of what you contribute.</p>
                 {!hideLogin && (
                     <Button
                         size="lg"
                         className="bg-[#ff75d8] hover:bg-[#ff75d8]/80 text-[#000] rounded-full px-8 py-4 text-lg"
                         onClick={handleLogin}
                     >
                         Log In
                     </Button>
                 )}
             </section>
         );
     }

    return (
        <section className="px-5 sm:px-10 py-5 space-y-6 text-foreground">
            {/* Stats + Recently Edited layout */}
            {isCompactLayout ? (
                <div className="flex flex-col gap-6 mb-8 max-w-3xl mx-auto text-center">
                    {/* Username + other controls as before */}
                    <div className="flex flex-col items-center gap-2 pb-1 w-full">
                        {/* Horizontal stats row (User / UGC Added / Artists Added) */}
                                                 {isGuestUser ? (
                             // Guest variant – single clickable row that asks the visitor to log in
                             <div
                                 data-guest-user="true"
                                 role="button"
                                 tabIndex={0}
                                 onClick={handleLogin}
                                 className="cursor-pointer flex items-center justify-center py-3 px-4 sm:px-6 border-2 border-[#c6bfc7] rounded-md bg-accent/40 hover:bg-accent/60 hover:ring-2 hover:ring-[#c6bfc7] w-full gap-2 focus:outline-none focus:ring-2 focus:ring-[#c6bfc7]"
                             >
                                 <span className="text-sm sm:text-lg font-medium underline">Log in to compare your statistics</span>
                             </div>
                        ) : (
                            <>
							<div
                                role="button"
                                tabIndex={0}
                                title="Jump to my leaderboard position"
                                onClick={() => {
                                    const el = document.getElementById('leaderboard-current-user');
                                    if (el) {
                                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                }}
                                className="relative cursor-pointer flex flex-row items-center py-3 px-4 sm:px-6 border-4 border-[#ff9ce3] rounded-md bg-background hover:bg-[#f3f4f6] dark:hover:bg-gray-800 w-full gap-4 sm:gap-6 focus:outline-none focus:ring-2 focus:ring-[#ff9ce3] shadow-[0_0_20px_rgba(255,156,227,0.3)] text-foreground"
                            >
                                 {/* User */}
 								<div className="flex items-center space-x-2 min-w-0">
 									{/* Avatar inline with username */}
								{!isGuestUser && (
 										<div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center">
										<img src="/default_pfp_pink.png" alt="Default Profile" className="w-full h-full object-cover" />
									</div>
								)}
                                    <span className="font-medium truncate text-sm sm:text-lg">
                                        {user?.username || user?.email || user?.wallet}
                                    </span>
                                </div>

                                {/* Rank */}
                                <div className="flex flex-row items-center gap-1 sm:gap-2 text-xs sm:text-lg whitespace-nowrap flex-shrink-0">
                                    <span className="font-semibold text-sm sm:text-lg">Rank:</span>
                                    <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary text-xs sm:text-base px-2 sm:px-4 py-0.5 sm:py-1">
                                        {rank === -1 ? 'N/A' : rank ?? '—'}
                                    </Badge>
                                    {totalEntries && (
                                        <>
                                            <span className="text-sm sm:text-lg">of</span>
                                            <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary text-xs sm:text-base px-2 sm:px-4 py-0.5 sm:py-1">
                                                {totalEntries}
                                            </Badge>
                                        </>
                                    )}
                                </div>

							{/* UGC Count */}
							<div className="flex flex-row flex-nowrap items-center gap-1 text-xs sm:text-lg whitespace-nowrap flex-shrink-0">
                                    <span className="font-semibold text-sm sm:text-lg">UGC Added:</span>
                                    <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary text-xs sm:text-base px-2 sm:px-4 py-0.5 sm:py-1">
                                        {isCompactLayout && ugcStats ? ugcStats.ugcCount : (allTimeStats?.ugcCount ?? '—')}
                                    </Badge>
                                </div>

							{/* Artists Count */}
							<div className="flex flex-row flex-nowrap items-center gap-1 text-xs sm:text-lg whitespace-nowrap flex-shrink-0">
                                    <span className="font-semibold text-sm sm:text-lg">Artists Added:</span>
                                    <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary text-xs sm:text-base px-2 sm:px-4 py-0.5 sm:py-1">
                                        {isCompactLayout && ugcStats ? ugcStats.artistsCount : (allTimeStats?.artistsCount ?? '—')}
                                    </Badge>
                                </div>
                            </div>

                            {/* Link under stats bar to jump to leaderboard */}
                            <a
                                href="#leaderboard-current-user"
                                onClick={(e) => {
                                    e.preventDefault();
                                    const el = document.getElementById('leaderboard-current-user');
                                    if (el) {
                                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                }}
                                className="mt-2 text-sm underline text-[#2ad4fc] hover:text-[#2ad4fc]"
                            >
                                View leaderboard position
                            </a>
                            </>
                          )}

                        {/* Edit username controls removed in leaderboard view */}
                                                 {/* Show a standalone login button for guests only when username editing is disabled */}
                         {!allowEditUsername && isGuestUser && !hideLogin && (
                             <div data-guest-user="true" className="pt-2">
                                 <Button
                                     size="sm"
                                     variant="secondary"
                                     className="bg-gray-200 text-foreground hover:bg-gray-300 border border-gray-300"
                                     onClick={handleLogin}
                                 >
                                     Log In
                                 </Button>
                             </div>
                         )}
                    </div>
                    {/* Admin user search removed */}

                    {/* Status row */}
                    {showStatus && (
                    <div className="flex items-center gap-2 text-lg w-full justify-center md:justify-center md:self-center md:text-center">
                        <span className="font-semibold">Role:</span>
                        <span className="font-normal">{statusString}</span>
                    </div>
                    )}

                    {/* The vertical dynamic stats block has been replaced by the horizontal grid above */}

                    {showDateRange && !allowEditUsername && (
                        <>
                            {/* Date range picker and action button inline */}
                            <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
                                <DatePicker date={date} setDate={setDate} />
                                <Button disabled={!date?.from || !date?.to} onClick={checkUgcStats}>Check UGC Stats</Button>
                            </div>
                            {loading && <p>Loading...</p>}
                        </>
                    )}
                </div>
            ) : (
                <div className="mx-auto max-w-6xl space-y-12 pb-12">
                    <header className="flex flex-col gap-6 border-b border-border pb-8 pt-6 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex items-center gap-4 min-w-0">
                            <ProfilePhoto userId={user.id} />
                            <div className="min-w-0">
                                <p className="text-sm text-muted-foreground mb-1">Your MusicNerd</p>
                                <h1 className="text-3xl sm:text-5xl font-bold tracking-tight break-words">{user.username && !user.username.includes('@') ? user.username : 'Your profile'}</h1>
                                {(!user.username || user.username.includes('@')) && <p className="mt-2 text-sm text-muted-foreground break-all">{displayName}</p>}
                                {showStatus && <p className="mt-2 text-sm text-muted-foreground">{statusString === 'User' ? 'Member' : statusString}</p>}
                            </div>
                        </div>
                        <Button variant="outline" className="self-start sm:shrink-0 rounded-full" onClick={() => setIsEditingUsername(!isEditingUsername)}>
                            <Pencil size={14} className="mr-2" /> Edit username
                        </Button>
                    </header>
                    {isEditingUsername && (
                        <form className="flex flex-wrap items-end gap-3 max-w-xl" onSubmit={e => { e.preventDefault(); void saveUsername(); }}>
                            <div className="flex-1 min-w-40"><label htmlFor="profile-username" className="block text-sm mb-2">Username</label>
                            <Input id="profile-username" value={usernameInput} onChange={e => setUsernameInput(e.target.value)} className="text-base" /></div>
                            <Button type="submit" disabled={savingUsername || !usernameInput} className="bg-[#ff75d8] text-[#000] hover:bg-[#ff75d8]/80">{savingUsername ? 'Saving…' : 'Save'}</Button>
                            <Button type="button" variant="ghost" onClick={() => { setUsernameInput(user.username ?? ''); setIsEditingUsername(false); }}>Cancel</Button>
                        </form>
                    )}
                    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12">
                        <section aria-labelledby="saved-artists-heading" className="min-w-0">
                            <div className="flex items-center justify-between gap-3 mb-2">
                                <h2 id="saved-artists-heading" className="text-2xl font-semibold tracking-tight">Your artists <span className="ml-1 text-muted-foreground text-base font-normal">{bookmarks.length}</span></h2>
                                {bookmarks.length > 0 && <Button variant="ghost" size="sm" onClick={() => isEditingBookmarks ? saveBookmarks() : setIsEditingBookmarks(true)}>{isEditingBookmarks ? 'Done' : 'Edit collection'}</Button>}
                            </div>
                            <p className="text-sm text-muted-foreground mb-6">The artists you’ve bookmarked. Saved in this browser.</p>
                            {bookmarks.length ? (
                                <>
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                        <SortableContext items={displayBookmarks.map(item => item.artistId)} strategy={rectSortingStrategy}>
                                            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-6">
                                                {displayBookmarks.map(item => <SortableBookmarkItem key={item.artistId} item={item} bio={artistSummaries[item.artistId]} isEditing={isEditingBookmarks} onDelete={deleteBookmark} />)}
                                            </ul>
                                        </SortableContext>
                                    </DndContext>
                                    {!isEditingBookmarks && totalBookmarkPages > 1 && <div className="flex items-center justify-between mt-6 gap-3">
                                        <Button variant="outline" size="sm" disabled={visibleBookmarkPage === 0} onClick={() => setBookmarkPage(p => Math.max(0, visibleBookmarkPage - 1))}>Previous</Button>
                                        <span className="text-sm text-muted-foreground">{visibleBookmarkPage + 1} / {totalBookmarkPages}</span>
                                        <Button variant="outline" size="sm" disabled={visibleBookmarkPage >= totalBookmarkPages - 1} onClick={() => setBookmarkPage(p => Math.min(totalBookmarkPages - 1, visibleBookmarkPage + 1))}>Next</Button>
                                    </div>}
                                </>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-border px-6 py-12 sm:py-16 text-center">
                                    <Bookmark className="mx-auto mb-5 text-[#ff75d8]" size={32} />
                                    <h3 className="text-xl font-semibold">Keep your artists close.</h3>
                                    <p className="mx-auto mt-2 mb-6 max-w-xs text-sm text-muted-foreground">Find an artist and tap the bookmark on their profile to save them here.</p>
                                    <Button asChild className="rounded-full bg-[#ff75d8] text-[#000] hover:bg-[#ff75d8]/80"><Link href="/">Find an artist <ArrowUpRight size={16} className="ml-2" /></Link></Button>
                                </div>
                            )}
                        </section>
                        <aside className="space-y-7">
                            <div className="rounded-2xl bg-[#ff75d8] text-[#000] p-6">
                                <h2 className="text-2xl font-semibold tracking-tight leading-tight">Know something we don’t?</h2>
                                <p className="mt-3 text-sm leading-relaxed">Add an artist. Share a link. Help another fan discover more.</p>
                                <Button variant="outline" className="mt-5 rounded-full border-black/30 bg-transparent text-[#000] hover:bg-black/10" onClick={() => { (document.querySelector('button[aria-label="Add new artist"]') as HTMLButtonElement | null)?.click(); }}><Plus size={16} className="mr-2" />Add an artist</Button>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">Your contributions</h2>
                                <p className="mt-1 text-sm text-muted-foreground">Every addition helps the next fan.</p>
                                <dl className="mt-5 divide-y divide-border">
                                    <div className="flex items-baseline justify-between py-3"><dt className="text-sm text-muted-foreground">UGC added</dt><dd className="text-2xl font-semibold tabular-nums">{allTimeStats?.ugcCount ?? '—'}</dd></div>
                                    <div className="flex items-baseline justify-between py-3"><dt className="text-sm text-muted-foreground">Artists added</dt><dd className="text-2xl font-semibold tabular-nums">{allTimeStats?.artistsCount ?? '—'}</dd></div>
                                </dl>
                                <Link href="/leaderboard" className="inline-flex items-center gap-2 text-sm underline underline-offset-4 mt-4">Community leaderboard <ArrowUpRight size={14} /></Link>
                            </div>
                        </aside>
                    </div>
                    {recentUGC.length > 0 && <section aria-labelledby="recent-edits-heading" className="border-t border-border pt-8">
                        <h2 id="recent-edits-heading" className="text-xl font-semibold mb-5">Artists you’ve contributed to</h2>
                        <ul className="flex flex-wrap gap-x-8 gap-y-4">{recentUGC.map(item => <li key={item.ugcId}><Link href={`/artist/${item.artistId ?? ''}`} className="flex items-center gap-3 hover:underline"><img src={item.imageUrl || '/default_pfp_pink.png'} alt="" className="h-10 w-10 rounded-full object-cover" /><span>{item.artistName ?? 'Unknown artist'}</span></Link></li>)}</ul>
                    </section>}
                    <section id="contribution-history" className="border-t border-border pt-8 min-w-0"><UserEntriesTable />{!isGuestUser && <SelfEditHistory key={user.id} />}</section>
                </div>
            )}

            {/* Leaderboard Section */}
            {showLeaderboard && (
            <div id="leaderboard-section" className="space-y-4">
                <Leaderboard
                    highlightIdentifier={isGuestUser ? undefined : (user.username || user.email || user.wallet || undefined)}
                    onRangeChange={selectedRange ? undefined : handleLeaderboardRangeChange}
                />
            </div>
            )}


        </section>
    )
}