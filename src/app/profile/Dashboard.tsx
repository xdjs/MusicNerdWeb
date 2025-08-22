"use client";

import DatePicker from "./DatePicker";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { DateRange } from "react-day-picker";
import { getUgcStatsInRangeAction as getUgcStatsInRange } from "@/app/actions/serverActions";
import { User } from "@/server/db/DbTypes";
import UgcStatsWrapper from "./Wrapper";
import Leaderboard from "./Leaderboard";
import { Pencil, Check, ArrowDownCircle, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import Jazzicon from 'react-jazzicon';
import { jsNumberForAddress } from 'react-jazzicon';
import { createPublicClient, http } from 'viem';
import { getEnsAvatar, getEnsName } from 'viem/ens';
import { mainnet } from 'wagmi/chains';
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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
    verticalListSortingStrategy,
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
function SortableBookmarkItem({ item, isEditing, onDelete }: { 
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
            <div className="flex items-center gap-3">
                {isEditing && (
                    <button
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing px-1 text-gray-400 hover:text-gray-600"
                        title="Drag to reorder"
                    >
                        <GripVertical size={16} />
                    </button>
                )}
                <Link href={`/artist/${item.artistId}`} className="flex items-center gap-3 hover:underline flex-1">
                    <img src={item.imageUrl || "/default_pfp_pink.png"} alt="artist" className="h-8 w-8 rounded-full object-cover" />
                    <span className="text-black dark:text-white">{item.artistName ?? 'Unknown Artist'}</span>
                </Link>
                {isEditing && (
                    <button
                        onClick={() => onDelete(item.artistId)}
                        className="text-red-600 hover:text-red-800 px-1"
                        title="Delete bookmark"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        </li>
    );
}

export default function Dashboard({ user, showLeaderboard = true, allowEditUsername = false, showDateRange = true, hideLogin = false, showStatus = true, selectedRange }: { user: User; showLeaderboard?: boolean; allowEditUsername?: boolean; showDateRange?: boolean; hideLogin?: boolean; showStatus?: boolean; selectedRange?: "today" | "week" | "month" | "all" }) {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate loading time for better UX
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <img className="h-12 w-12" src="/spinner.svg" alt="Loading..." />
                                    <p className="text-foreground text-xl">Loading...</p>
            </div>
        );
    }

    return <UgcStatsWrapper><UgcStats user={user} showLeaderboard={showLeaderboard} allowEditUsername={allowEditUsername} showDateRange={showDateRange} hideLogin={hideLogin} showStatus={showStatus} selectedRange={selectedRange} /></UgcStatsWrapper>;
}

function UgcStats({ user, showLeaderboard = true, allowEditUsername = false, showDateRange = true, hideLogin = false, showStatus = true, selectedRange }: { user: User; showLeaderboard?: boolean; allowEditUsername?: boolean; showDateRange?: boolean; hideLogin?: boolean; showStatus?: boolean; selectedRange?: "today" | "week" | "month" | "all" }) {
    const [date, setDate] = useState<DateRange | undefined>();
    const [ugcStats, setUgcStats] = useState<{ ugcCount: number, artistsCount: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [ugcStatsUserWallet, setUgcStatsUserWallet] = useState<string | null>(null); // retained for future but UI removed
    const [query, setQuery] = useState(''); // retained; will not be used but harmless
    const [allTimeStats, setAllTimeStats] = useState<{ ugcCount: number, artistsCount: number } | null>(null);
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [usernameInput, setUsernameInput] = useState(user.username ?? "");
    const [savingUsername, setSavingUsername] = useState(false);
    const [recentUGC, setRecentUGC] = useState<RecentItem[]>([]);
    // Avatar state (ENS/Jazzicon) for profile header
    const [ensAvatarUrl, setEnsAvatarUrl] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState(false);
    const [jazziconSeed, setJazziconSeed] = useState<number | null>(null);
    const [ensLoading, setEnsLoading] = useState(false);

    const publicClient = createPublicClient({ chain: mainnet, transport: http() });

    useEffect(() => {
        let cancelled = false;
        async function resolveAvatar() {
            if (!user?.wallet) {
                setEnsAvatarUrl(null);
                setJazziconSeed(null);
                return;
            }
            setEnsLoading(true);
            setAvatarError(false);
            try {
                const ensName = await getEnsName(publicClient, { address: user.wallet as `0x${string}` });
                let finalAvatar: string | null = null;
                if (ensName) {
                    finalAvatar = await getEnsAvatar(publicClient, { name: ensName });
                }
                if (!cancelled) {
                    setEnsAvatarUrl(finalAvatar ?? null);
                    setJazziconSeed(finalAvatar ? null : jsNumberForAddress(user.wallet));
                }
            } catch {
                if (!cancelled) {
                    setEnsAvatarUrl(null);
                    setJazziconSeed(user.wallet ? jsNumberForAddress(user.wallet) : null);
                }
            } finally {
                if (!cancelled) setEnsLoading(false);
            }
        }
        resolveAvatar();
        return () => { cancelled = true; };
    }, [user?.wallet]);
    const [rank, setRank] = useState<number | null>(null);
    // ----------- Bookmarks state & pagination -----------
    const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
    const [bookmarkPage, setBookmarkPage] = useState(0);
    const [isEditingBookmarks, setIsEditingBookmarks] = useState(false);
    const pageSize = 3;

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

        if (active.id !== over?.id) {
            setBookmarks((items) => {
                const oldIndex = items.findIndex((item) => item.artistId === active.id);
                const newIndex = items.findIndex((item) => item.artistId === over?.id);

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
    const currentBookmarks = bookmarks.slice(bookmarkPage * pageSize, bookmarkPage * pageSize + pageSize);
    // In edit mode, show the full list with a scrollbar (no pagination)
    const displayBookmarks = isEditingBookmarks ? bookmarks : currentBookmarks;
    const isCompactLayout = !allowEditUsername; // compact (leaderboard-style) when username editing disabled

	    // Range selection (synced with Leaderboard)
    type RangeKey = "today" | "week" | "month" | "all";
    const [internalSelectedRange, setInternalSelectedRange] = useState<RangeKey>("today");
    const selectedRangeToUse = selectedRange || internalSelectedRange;
    
    // Debug logging
    console.log('[Dashboard] Range state:', { selectedRange, internalSelectedRange, selectedRangeToUse });

    // (duplicate RangeKey and selectedRange definition removed)

	// ENS avatar fetch for the logged-in user's wallet (top gray bar avatar)
	useEffect(() => {
		let cancelled = false;
		async function resolveAvatar() {
			if (!user?.wallet) {
				setEnsAvatarUrl(null);
				setJazziconSeed(null);
				return;
			}
			setEnsLoading(true);
			setAvatarError(false);
			try {
				const publicClient = createPublicClient({ chain: mainnet, transport: http() });
				const ensName = await getEnsName(publicClient, { address: user.wallet as `0x${string}` });
				let finalAvatar: string | null = null;
				if (ensName) {
					finalAvatar = await getEnsAvatar(publicClient, { name: ensName });
				}
				if (!cancelled) {
					setEnsAvatarUrl(finalAvatar ?? null);
					setJazziconSeed(finalAvatar ? null : jsNumberForAddress(user.wallet));
				}
			} catch (e) {
				if (!cancelled) {
					setEnsAvatarUrl(null);
					setJazziconSeed(user?.wallet ? jsNumberForAddress(user.wallet) : null);
				}
			} finally {
				if (!cancelled) setEnsLoading(false);
			}
		}
		resolveAvatar();
		return () => { cancelled = true; };
	}, [user?.wallet]);

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
                console.log('[Dashboard] Fetching rank:', { url, selectedRangeToUse, dates, isCompactLayout });

                const resp = await fetch(url);
                if (!resp.ok) return;
                const data = await resp.json();
                
                // Handle both paginated and non-paginated responses
                const entries = Array.isArray(data) ? data : data.entries;
                
                console.log('[Dashboard] API response:', { dataLength: entries?.length, isArray: Array.isArray(data) });
                
                // Exclude hidden users from total count
                const nonHiddenUsers = entries.filter((entry: any) => !entry.isHidden);
                setTotalEntries(nonHiddenUsers.length);
                
                const idx = entries.findIndex((entry: any) => entry.wallet?.toLowerCase() === user.wallet.toLowerCase());
                console.log('[Dashboard] User lookup:', { idx, userWallet: user.wallet });
                
                if (idx !== -1) {
                    // Check if the current user is hidden - check both user object and leaderboard entry
                    const userEntry = entries[idx];
                    const isUserHidden = user.isHidden || userEntry?.isHidden;
                    
                    if (isUserHidden) {
                        setRank(-1); // Use -1 to indicate hidden user
                    } else {
                        // Calculate rank among non-hidden users only
                        const nonHiddenIdx = nonHiddenUsers.findIndex((entry: any) => entry.wallet?.toLowerCase() === user.wallet.toLowerCase());
                        if (nonHiddenIdx !== -1) {
                            setRank(nonHiddenIdx + 1);
                        }
                    }
                    
                    // Set stats from leaderboard data to ensure consistency (only in compact layout)
                    if (userEntry && isCompactLayout) {
                        console.log('[Dashboard] Setting stats from userEntry:', {
                            ugcCount: userEntry.ugcCount,
                            artistsCount: userEntry.artistsCount
                        });
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
    
    // Debug logging for useEffect dependencies
    console.log('[Dashboard] useEffect dependencies:', {
        selectedRangeToUse,
        userWallet: user.wallet,
        isCompactLayout,
        allowEditUsername
    });
    const isGuestUser = user.username === 'Guest User' || user.id === '00000000-0000-0000-0000-000000000000';
    const displayName = isGuestUser ? 'User Profile' : (user?.username ? user.username : user?.wallet);
    // Determine user status string for display (support multiple roles)
    const statusString = (() => {
        const roles: string[] = [];
        if (user.isAdmin) roles.push("Admin");
        if (user.isWhiteListed) roles.push("Whitelisted");
        if (roles.length === 0) roles.push("User");
        if (user.isHidden) roles.push("Hidden");
        return roles.join(", ");
    })();

    const { openConnectModal } = useConnectModal();
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
        if (openConnectModal) {
            openConnectModal();
        } else {
            const navLoginBtn = document.getElementById("login-btn");
            if (navLoginBtn) {
                (navLoginBtn as HTMLButtonElement).click();
            }
        }
    }

    async function checkUgcStats() {
        if (date?.from && date?.to) {
            setLoading(true);
            const result = await getUgcStatsInRange(date, ugcStatsUserWallet);
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
            const resp = await fetch(`/api/admin/whitelist-user/${user.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: usernameInput })
            });
            const data = await resp.json();
            if (data.status === "success") {
                window.location.reload();
            } else {
                alert(data.message || "Failed to update username");
            }
        } catch(e) {
            alert("Server error updating username");
        }
        setSavingUsername(false);
        setIsEditingUsername(false);
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
                const result = await getUgcStatsInRange(dateRange, ugcStatsUserWallet);
                if (result) setAllTimeStats(result);
            } catch (e) {
                console.error('[Dashboard] Error fetching all-time UGC stats', e);
            }
        }

        fetchAllTimeStats();
    }, [ugcStatsUserWallet]);

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
                 <h1 className="text-3xl font-bold">User Profile</h1>
                 {!hideLogin && (
                     <Button
                         size="lg"
                         className="bg-pastypink hover:bg-gray-200 text-white px-8 py-4 text-xl"
                         onClick={handleLogin}
                     >
                         Log In
                     </Button>
                 )}
             </section>
         );
     }

    return (
        <section className="px-5 sm:px-10 py-5 space-y-6">
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
                                className="relative cursor-pointer grid grid-cols-2 sm:grid-cols-4 items-center py-3 px-4 sm:px-6 border-4 border-[#ff9ce3] rounded-md bg-background hover:bg-[#f3f4f6] dark:hover:bg-gray-800 w-full gap-x-4 gap-y-3 justify-items-center focus:outline-none focus:ring-2 focus:ring-[#ff9ce3] shadow-[0_0_20px_rgba(255,156,227,0.3)] text-foreground"
                            >
                                 {/* User */}
 								<div className="flex items-center space-x-2 overflow-hidden justify-start mr-4 sm:mr-0 pl-4 sm:pl-0 justify-self-start sm:justify-self-center">
 									{/* Avatar inline with username */}
								{!isGuestUser && (
 										<div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center">
										{ensLoading ? (
											<img className="w-4 h-4" src="/spinner.svg" alt="Loading..." />
										) : ensAvatarUrl && !avatarError ? (
											<img src={ensAvatarUrl} alt="ENS Avatar" className="w-full h-full object-cover" onError={() => setAvatarError(true)} />
										) : jazziconSeed ? (
											<Jazzicon diameter={32} seed={jazziconSeed} />
										) : (
											<img src="/default_pfp_pink.png" alt="Default Profile" className="w-full h-full object-cover" />
										)}
									</div>
								)}
                                    <span className="font-medium truncate max-w-[160px] text-sm sm:text-lg">
                                        {ugcStatsUserWallet ?? (user?.username ? user.username : user?.wallet)}
                                    </span>
                                    {/* (arrow removed; entire bar now clickable) */}
                                </div>

                                {/* Rank */}
                                <div className="flex flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-lg whitespace-nowrap sm:justify-center justify-center ml-4 sm:ml-0 pr-4 sm:pr-0">
                                    <span className="font-semibold text-xs sm:text-base">Rank:</span>
                                    <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary text-xs sm:text-base px-2 sm:px-4 py-0.5 sm:py-1">
                                        {rank === -1 ? 'N/A' : rank ?? '—'}
                                    </Badge>
                                    {totalEntries && (
                                        <>
                                            <span className="text-xs sm:text-base">of</span>
                                            <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary text-xs sm:text-base px-2 sm:px-4 py-0.5 sm:py-1">
                                                {totalEntries}
                                            </Badge>
                                        </>
                                    )}
                                    {/* (arrow moved next to name) */}
                                </div>

							{/* UGC Count */}
							<div className="flex flex-row flex-nowrap items-center justify-center gap-1 text-xs sm:text-base whitespace-nowrap">
                                    <span className="font-semibold text-xs sm:text-base">UGC Added:</span>
                                    <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary text-base px-4 py-1">
                                        {isCompactLayout && ugcStats ? ugcStats.ugcCount : (allTimeStats?.ugcCount ?? '—')}
                                    </Badge>
                                </div>

							{/* Artists Count */}
							<div className="flex flex-row flex-nowrap items-center justify-center gap-1 text-xs sm:text-base whitespace-nowrap">
                                    <span className="font-semibold text-xs sm:text-base">Artists Added:</span>
                                    <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary text-base px-4 py-1">
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
                <>
                    {/* Username row displayed above the three columns on all breakpoints */}
					<div className="relative pb-4 w-full md:max-w-4xl md:mx-auto">
						                        {!isEditingUsername && (
                            <div className="flex items-center justify-start md:justify-center gap-3 w-full">
								{/* Avatar left of username using ENS/Jazzicon logic */}
								<div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center hover:animate-[slow-spin_10s_linear_infinite]">
									{ensLoading ? (
										<img className="w-4 h-4" src="/spinner.svg" alt="Loading..." />
									) : ensAvatarUrl && !avatarError ? (
										<img src={ensAvatarUrl} alt="ENS Avatar" className="w-full h-full object-cover" onError={() => setAvatarError(true)} />
									) : jazziconSeed ? (
										<Jazzicon diameter={32} seed={jazziconSeed} />
									) : (
										<img src="/default_pfp_pink.png" alt="Default Profile" className="w-full h-full object-cover" />
									)}
								</div>
								<p className="text-lg font-semibold leading-none text-foreground">
									{displayName}
								</p>
							</div>
						)}
                                                 {/* Mobile Edit button under username */}
                         {allowEditUsername && !isGuestUser && (
                             <div className="md:hidden pt-6 flex justify-center">
                                 <Button
                                     size="sm"
                                     variant="ghost"
                                     className="bg-gray-200 text-foreground hover:bg-gray-300"
                                     onClick={() => {
                                         setIsEditingUsername((prev) => !prev);
                                         setIsEditingBookmarks((prev) => !prev);
                                     }}
                                 >
                                     {isEditingUsername || isEditingBookmarks ? (
                                         <div className="flex items-center gap-1">
                                             <Check size={14} /> Done
                                         </div>
                                     ) : (
                                         <div className="flex items-center gap-1">
                                             <Pencil size={14} /> Edit
                                         </div>
                                     )}
                                 </Button>
                             </div>
                         )}

                         

                        
                        {allowEditUsername && !isGuestUser && isEditingUsername && (
                            <div className="flex flex-col items-center gap-2 w-full pt-2">
                                <div className="flex items-center gap-2 border-2 border-gray-300 bg-background rounded-md px-3 py-2 shadow-sm w-64 flex-nowrap">
                                    <Input
                                        value={usernameInput}
                                        onChange={(e) => setUsernameInput(e.target.value)}
                                        className="h-8 flex-1 min-w-0 text-lg"
                                    />
                                    <Button size="sm" className="bg-gray-200 text-foreground hover:bg-gray-300 border border-gray-300" onClick={saveUsername} disabled={savingUsername || !usernameInput}>
                                        {savingUsername ? 'Saving...' : 'Save'}
                                    </Button>
                                    <Button size="sm" variant="ghost" className="border border-gray-300" onClick={() => {
                                        setIsEditingUsername(false);
                                    }}>Cancel</Button>
                                </div>
                            </div>
                        )}
                                                 {/* Fallback login button for views where username editing is not allowed */}
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

                                                                                                                             {/* Three-column section under username */}
                       <div className="flex flex-col space-y-8 md:grid md:w-fit md:grid-cols-[auto_auto_1fr] md:gap-32 md:space-y-0 md:max-w-4xl mx-auto text-center md:text-left relative">
                                                   {/* Desktop Edit button positioned above Recently Edited column */}
                          {allowEditUsername && !isGuestUser && (
                              <div className="hidden md:block absolute -top-20 right-0">
                                  <Button
                                      size="sm"
                                      variant="ghost"
                                      className="bg-gray-200 text-foreground hover:bg-gray-300"
                                      onClick={() => {
                                          setIsEditingUsername((prev) => !prev);
                                          setIsEditingBookmarks((prev) => !prev);
                                      }}
                                  >
                                      {isEditingUsername || isEditingBookmarks ? (
                                          <div className="flex items-center gap-1">
                                              <Check size={14} /> Done
                                          </div>
                                      ) : (
                                          <div className="flex items-center gap-1">
                                              <Pencil size={14} /> Edit
                                          </div>
                                      )}
                                  </Button>
                              </div>
                          )}
                        {/* Left column - admin controls, status & stats */}
                        <div className="flex flex-col md:flex-none md:items-start md:text-left">
                            {/* Top area: admin controls and status */}
                            <div className="space-y-4">
                                {/* Admin user search removed */}

                                {/* Role heading aligned with other column headings */}
                                {showStatus && (
                                    <div className="flex items-center gap-2 text-lg w-full justify-center md:justify-start">
                                        <span className="font-semibold text-foreground">Role:</span>
                                        <span className="font-normal text-foreground">{statusString}</span>
                                    </div>
                                )}
                            </div>

                            {/* Bottom area: UGC / Artists stats (vertical layout) */}
                            <div className="mt-4">
                            <Button
                                asChild
                                variant="outline"
                                className="py-4 space-y-2 text-left border-2 border-[#ff9ce3] hover:bg-[#f3f4f6] h-auto self-center md:self-end w-64"
                            >
                                <Link href="/leaderboard" className="inline-flex flex-col items-start justify-start space-y-2 text-foreground">
                                    {/* User Rank */}
                                    <div className="flex justify-between text-lg w-full"><span className="font-semibold text-foreground">User Rank:</span><span className="font-normal text-right flex-1 truncate text-foreground">{rank === -1 ? 'N/A' : rank ? `${rank} of ${totalEntries ?? '—'}` : '—'}</span></div>
                                    <div className="flex justify-between text-lg w-full"><span className="font-semibold text-foreground">UGC Total:</span><span className="font-normal text-right flex-1 truncate text-foreground">{allTimeStats?.ugcCount ?? '—'}</span></div>
                                    <div className="flex justify-between text-lg w-full"><span className="font-semibold text-foreground">Artists Total:</span><span className="font-normal text-right flex-1 truncate text-foreground">{allTimeStats?.artistsCount ?? '—'}</span></div>
                                </Link>
                            </Button>
                            </div>
                            </div>

                        {/* Middle column - Bookmarks */}
                        <div className="space-y-4 mt-12 md:mt-0 flex flex-col items-center text-center md:items-start md:text-left md:flex-none">
                            {!isGuestUser && (
                                <>
                                    <div className="flex items-center gap-2 w-full justify-center md:justify-start">
                                        <h3 className="text-lg font-semibold text-center md:text-left text-foreground">Bookmarks</h3>
                                        {isEditingBookmarks && bookmarks.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <Button size="sm" className="bg-gray-200 text-foreground hover:bg-gray-300 border border-gray-300" onClick={saveBookmarks}>
                                                    Save
                                                </Button>
                                                <Button size="sm" variant="ghost" className="border border-gray-300" onClick={() => { 
                                                    setIsEditingBookmarks(false); 
                                                }}>
                                                    Cancel
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {bookmarks.length ? (
                                        <>
                                            <DndContext
                                                sensors={sensors}
                                                collisionDetection={closestCenter}
                                                onDragEnd={handleDragEnd}
                                            >
                                                <SortableContext
                                                    items={displayBookmarks.map(item => item.artistId)}
                                                    strategy={verticalListSortingStrategy}
                                                >
									<div className={isEditingBookmarks ? "max-h-40 overflow-y-scroll pr-1 w-full" : undefined}>
										<ul className="space-y-3">
                                                            {displayBookmarks.map((item) => (
                                                                <SortableBookmarkItem
                                                                    key={item.artistId}
                                                                    item={item}
                                                                    isEditing={isEditingBookmarks}
                                                                    onDelete={deleteBookmark}
                                                                />
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </SortableContext>
                                            </DndContext>
                                        </>
                                    ) : (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center md:text-left">No bookmarks yet</p>
                                    )}

                                    {/* Pagination controls - moved to bottom */}
                                    {!isEditingBookmarks && totalBookmarkPages > 1 && (
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="bg-pastypink text-white hover:bg-pastypink/90 hover:text-white border-2 border-pastypink"
                                                onClick={() => setBookmarkPage((p) => Math.max(0, p - 1))}
                                                disabled={bookmarkPage === 0}
                                            >
                                                Previous
                                            </Button>
                                            <span className="text-sm text-foreground">
                                                {bookmarkPage + 1} / {totalBookmarkPages}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="bg-pastypink text-white hover:bg-pastypink/90 hover:text-white border-2 border-pastypink"
                                                onClick={() => setBookmarkPage((p) => Math.min(totalBookmarkPages - 1, p + 1))}
                                                disabled={bookmarkPage >= totalBookmarkPages - 1}
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>



                                                                                                                                                                                                                                                                                                                                                                                                               {/* Right column - recently edited */}
                            <div className="space-y-4 flex flex-col items-center md:items-start md:text-left md:flex-none">
                                                               <h3 className="text-lg font-semibold text-center md:text-left whitespace-nowrap min-w-[140px] text-foreground">Recently Edited</h3>
                            {recentUGC.length ? (
                                <ul className="space-y-3">
                                    {recentUGC.map((item) => (
                                        <li key={item.ugcId}>
                                            <Link href={`/artist/${item.artistId ?? ''}`} className="flex items-center gap-3 hover:underline">
                                                <img src={item.imageUrl || "/default_pfp_pink.png"} alt="artist" className="h-8 w-8 rounded-full object-cover" />
                                                <span className="text-foreground">{item.artistName ?? 'Unknown Artist'}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500 text-center md:text-left">No recent edits</p>
                            )}
                        </div>
                    </div>

                    {/* User Artist Data Entries table */}
                    <UserEntriesTable />
                </>
            )}

            {/* Leaderboard Section */}
            {showLeaderboard && (
            <div id="leaderboard-section" className="space-y-4">
                <Leaderboard 
                    highlightIdentifier={isGuestUser ? undefined : (user.username || user.wallet)} 
                    onRangeChange={selectedRange ? undefined : handleLeaderboardRangeChange} 
                />
            </div>
            )}
            

        </section>
    )
}