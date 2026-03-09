"use client"
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import { useSearchParams } from 'next/navigation'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { Artist } from '@/server/db/DbTypes';
import { Search, ExternalLink, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSession } from "next-auth/react";
import { useLogin } from "@privy-io/react-auth";
import { addArtist } from "@/app/actions/addArtist";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 0,
            gcTime: 0,
            refetchOnWindowFocus: false,
        },
    },
})

interface SpotifyArtistImage {
  url: string;
  height: number;
  width: number;
}

interface SearchResult extends Artist {
  isSpotifyOnly?: boolean;
  images?: SpotifyArtistImage[];
}

interface SearchBarProps {
    isTopSide?: boolean;
    autoFocus?: boolean;
}

const PENDING_ADD_KEY = 'pendingAddArtistSpotifyId';
const PENDING_ADD_TS_KEY = 'pendingAddArtistTimestamp';
const PENDING_ADD_TTL_MS = 5 * 60 * 1000;

function SearchBarInner({ isTopSide = false, autoFocus = false }: SearchBarProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [query, setQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [debouncedQuery] = useDebounce(query, 200);
    const searchParams = useSearchParams();
    const resultsContainer = useRef(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const search = searchParams.get('search');
    const blurTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const { data: session } = useSession();
    const { login } = useLogin();
    const [addingSpotifyId, setAddingSpotifyId] = useState<string | null>(null);

    const handleAddArtist = useCallback(async (spotifyId: string) => {
        try {
            setAddingSpotifyId(spotifyId);
            const addResult = await addArtist(spotifyId);

            if ((addResult.status === "success" || addResult.status === "exists") && addResult.artistId) {
                setShowResults(false);
                setQuery('');
                router.push(`/artist/${addResult.artistId}`);
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: addResult.message || "Failed to add artist"
                });
            }
        } catch (error) {
            console.error("[SearchBar] Error adding artist:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to add artist - please try again"
            });
        } finally {
            setAddingSpotifyId(null);
        }
    }, [router, toast]);

    useEffect(() => {
        if (!session) return;
        const pendingId = sessionStorage.getItem(PENDING_ADD_KEY);
        if (!pendingId) return;

        const timestamp = Number(sessionStorage.getItem(PENDING_ADD_TS_KEY) || '0');
        sessionStorage.removeItem(PENDING_ADD_KEY);
        sessionStorage.removeItem(PENDING_ADD_TS_KEY);

        if (Date.now() - timestamp > PENDING_ADD_TTL_MS) return;

        handleAddArtist(pendingId);
    }, [session, handleAddArtist]);

    useEffect(() => {
        setQuery(search ?? '');
    }, [search]);

    // Auto-focus functionality
    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus]);

    // Expose focus method for external triggers
    const focusInput = useCallback(() => {
        inputRef.current?.focus();
    }, []);

    // Make focus method available globally for homepage CTA
    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as unknown as { focusSearchBar?: () => void }).focusSearchBar = focusInput;
        }
        return () => {
            if (typeof window !== 'undefined') {
                delete (window as unknown as { focusSearchBar?: () => void }).focusSearchBar;
            }
        };
    }, [focusInput]);

    const { data: results = [], isLoading } = useQuery<SearchResult[]>({
        queryKey: ['searchArtists', debouncedQuery],
        queryFn: async () => {
            if (!debouncedQuery || debouncedQuery.trim() === '') return [];

            const response = await fetch('/api/searchArtists', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: debouncedQuery }),
            });
            if (!response.ok) {
                throw new Error('Search failed');
            }
            const data = await response.json();
            return data.results;
        },
        enabled: debouncedQuery.trim() !== '',
    });

    useEffect(() => {
        if (debouncedQuery && debouncedQuery.trim() !== '' && results.length > 0) {
            setShowResults(true);
        }
    }, [debouncedQuery, results]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);

        if (value.trim() === '') {
            setShowResults(false);
        }
    };

    const handleBlur = () => {
        blurTimeoutRef.current = setTimeout(() => {
            setShowResults(false);
        }, 200);
    };

    const handleFocus = () => {
        if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
        }
        if (query.trim() !== '' && results.length > 0) {
            setShowResults(true);
        }
    };

    useEffect(() => {
        return () => {
            if (blurTimeoutRef.current) {
                clearTimeout(blurTimeoutRef.current);
            }
        };
    }, []);

    const handleResultClick = async (result: SearchResult) => {
        if (result.isSpotifyOnly) {
            if (!result.spotify) return;

            if (!session) {
                sessionStorage.setItem(PENDING_ADD_KEY, result.spotify);
                sessionStorage.setItem(PENDING_ADD_TS_KEY, String(Date.now()));
                login();
                return;
            }

            await handleAddArtist(result.spotify);
            return;
        }

        setShowResults(false);
        setQuery('');

        if (result.id) {
            router.push(`/artist/${result.id}`);
        }
    };

    return (
        <div className="relative w-full">
            {/* Search Input */}
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search artists..."
                    value={query}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    onFocus={handleFocus}
                    className="w-full h-10 pl-10 pr-4 bg-white/5 border border-white/10 rounded-lg
                               text-white placeholder:text-white/40
                               focus:outline-none focus:border-white/25 focus:bg-white/[0.07]
                               transition-all duration-200"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            </div>

            {/* Results Dropdown */}
            {showResults && results.length > 0 && (
                <div
                    ref={resultsContainer}
                    className="absolute w-full mt-2 bg-card border border-border rounded-xl 
                               shadow-2xl shadow-black/50 max-h-96 overflow-y-auto z-50
                               animate-fade-in"
                >
                    {results.map((result) => {
                        const spotifyImage = result.images?.[0]?.url;
                        const hasSocialLinks = result.bandcamp || result.youtube || result.youtubechannel || result.instagram || result.x || result.facebook || result.tiktok;
                        const isThisAdding = result.isSpotifyOnly && addingSpotifyId === result.spotify;

                        return (
                            <button
                                key={result.isSpotifyOnly ? `spotify-${result.spotify}` : result.id}
                                disabled={isThisAdding}
                                onClick={() => handleResultClick(result)}
                                className={`w-full p-3 flex items-center gap-3 text-left 
                                           transition-colors duration-150
                                           disabled:opacity-50 
                                           hover:bg-white/5 
                                           border-b border-border/50 last:border-b-0`}
                            >
                                {/* Avatar */}
                                <div className="flex-shrink-0">
                                    <img
                                        src={spotifyImage || "/default_pfp_pink.png"}
                                        alt={result.name ?? "Artist"}
                                        className={`object-cover rounded-full ${
                                            result.isSpotifyOnly ? 'w-8 h-8 opacity-70' : 'w-10 h-10'
                                        }`}
                                    />
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className={`font-medium truncate ${
                                        result.isSpotifyOnly 
                                            ? 'text-sm text-white/60' 
                                            : 'text-white'
                                    }`}>
                                        {result.name}
                                    </div>
                                    
                                    {result.isSpotifyOnly && result.spotify ? (
                                        <div className="flex items-center gap-2 text-xs text-white/40 mt-0.5">
                                            <span className="flex items-center gap-1">
                                                <Plus size={10} />
                                                {isThisAdding ? 'Adding...' : 'Add to archive'}
                                            </span>
                                            <span className="text-white/20">|</span>
                                            <a
                                                href={`https://open.spotify.com/artist/${result.spotify}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex items-center gap-1 hover:text-white/60 transition-colors"
                                            >
                                                <span>Spotify</span>
                                                <ExternalLink size={10} />
                                            </a>
                                        </div>
                                    ) : hasSocialLinks && (
                                        <div className="flex items-center gap-2 mt-1">
                                            {result.bandcamp && (
                                                <img src="/siteIcons/bandcamp_icon.svg" alt="Bandcamp" className="w-3 h-3 opacity-50" />
                                            )}
                                            {(result.youtube || result.youtubechannel) && (
                                                <img src="/siteIcons/youtube_icon.svg" alt="YouTube" className="w-3 h-3 opacity-50" />
                                            )}
                                            {result.instagram && (
                                                <img src="/siteIcons/instagram-svgrepo-com.svg" alt="Instagram" className="w-3 h-3 opacity-50" />
                                            )}
                                            {result.x && (
                                                <img src="/siteIcons/x_icon.svg" alt="X" className="w-3 h-3 opacity-50" />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="absolute w-full mt-2 bg-card border border-border rounded-xl p-4 text-center z-50">
                    <div className="text-white/40 text-sm">Searching...</div>
                </div>
            )}
        </div>
    );
}

export default function SearchBar(props: SearchBarProps) {
    return (
        <QueryClientProvider client={queryClient}>
            <SearchBarInner {...props} />
        </QueryClientProvider>
    );
}
