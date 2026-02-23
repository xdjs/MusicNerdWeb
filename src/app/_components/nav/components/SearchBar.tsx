"use client"
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import { useSearchParams } from 'next/navigation'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { Artist } from '@/server/db/DbTypes';
import { Input } from '@/components/ui/input';
import { Search, ExternalLink } from 'lucide-react';
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
}

function SearchBarInner({ isTopSide = false }: SearchBarProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [query, setQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [debouncedQuery] = useDebounce(query, 200);
    const searchParams = useSearchParams();
    const resultsContainer = useRef(null);
    const search = searchParams.get('search');
    const blurTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const { data: session } = useSession();
    const { login } = useLogin();
    const [isAddingArtist, setIsAddingArtist] = useState(false);

    useEffect(() => {
        setQuery(search ?? '');
    }, [search]);

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
            if (!session) {
                login();
                return;
            }

            try {
                setIsAddingArtist(true);
                setShowResults(false);
                const addResult = await addArtist(result.spotify ?? "");

                if ((addResult.status === "success" || addResult.status === "exists") && addResult.artistId) {
                    router.push(`/artist/${addResult.artistId}`);
                    setQuery('');
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
                setIsAddingArtist(false);
            }
            return;
        }

        setShowResults(false);
        setQuery('');

        if (result.id) {
            router.push(`/artist/${result.id}`);
        }
    };

    return (
        <div className="relative w-full max-w-[400px]">
            <div className="relative">
                <Input
                    type="text"
                    placeholder="Search for an artist..."
                    value={query}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    onFocus={handleFocus}
                    className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            {showResults && results.length > 0 && (
                <div
                    ref={resultsContainer}
                    className="absolute w-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50"
                >
                    {results.map((result) => {
                        const spotifyImage = result.images?.[0]?.url;
                        const hasSocialLinks = result.bandcamp || result.youtube || result.youtubechannel || result.instagram || result.x || result.facebook || result.tiktok;

                        return (
                            <button
                                key={result.isSpotifyOnly ? `spotify-${result.spotify}` : result.id}
                                onClick={() => handleResultClick(result)}
                                className={`w-full p-3 flex items-center gap-3 text-left ${
                                    result.isSpotifyOnly
                                        ? 'hover:bg-gray-50 dark:hover:bg-gray-750'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                <div className="flex items-center justify-center w-10 h-10">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={spotifyImage || "/default_pfp_pink.png"}
                                        alt={result.name ?? "Artist"}
                                        className={`object-cover rounded-full ${result.isSpotifyOnly ? 'w-8 h-8' : 'w-10 h-10'}`}
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className={`font-medium ${result.isSpotifyOnly ? 'text-sm text-gray-500 dark:text-gray-400' : 'text-base text-gray-900 dark:text-white'}`}>
                                        {result.name}
                                    </div>
                                    {result.isSpotifyOnly ? (
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                            <span className="cursor-pointer hover:text-gray-600 hover:underline">Add to MusicNerd</span>
                                            <span className="text-pink-400">|</span>
                                            <div
                                                className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer hover:text-gray-600"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(`https://open.spotify.com/artist/${result.spotify}`, '_blank');
                                                }}
                                            >
                                                <span className="hover:underline">View on Spotify</span>
                                                <ExternalLink size={12} className="text-gray-500" />
                                            </div>
                                        </div>
                                    ) : hasSocialLinks && (
                                        <div className="flex items-center gap-2 mt-1">
                                            {result.bandcamp && (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img src="/siteIcons/bandcamp_icon.svg" alt="Bandcamp" className="w-3.5 h-3.5 opacity-70" />
                                            )}
                                            {(result.youtube || result.youtubechannel) && (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img src="/siteIcons/youtube_icon.svg" alt="YouTube" className="w-3.5 h-3.5 opacity-70" />
                                            )}
                                            {result.instagram && (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img src="/siteIcons/instagram-svgrepo-com.svg" alt="Instagram" className="w-3.5 h-3.5 opacity-70" />
                                            )}
                                            {result.x && (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img src="/siteIcons/x_icon.svg" alt="X" className="w-3.5 h-3.5 opacity-70" />
                                            )}
                                            {result.facebook && (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img src="/siteIcons/facebook_icon.svg" alt="Facebook" className="w-3.5 h-3.5 opacity-70" />
                                            )}
                                            {result.tiktok && (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img src="/siteIcons/tiktok_icon.svg" alt="TikTok" className="w-3.5 h-3.5 opacity-70" />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {isLoading && (
                <div className="absolute w-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 text-center z-50">
                    <div className="text-gray-600 dark:text-gray-400">Searching...</div>
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
