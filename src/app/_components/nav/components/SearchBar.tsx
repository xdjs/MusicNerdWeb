"use client"
import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { Artist } from '@/server/db/DbTypes';
import { Input } from '@/components/ui/input';
import { Search, ExternalLink } from 'lucide-react';
import Image from 'next/image';

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
    const pathname = usePathname();
    const [query, setQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [debouncedQuery] = useDebounce(query, 200);
    const searchParams = useSearchParams();
    const resultsContainer = useRef(null);
    const search = searchParams.get('search');
    const blurTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    useEffect(() => {
        setQuery(search ?? '');
    }, [search]);

    const { data: results = [], isLoading } = useQuery<SearchResult[]>({
        queryKey: ['searchArtists', debouncedQuery],
        queryFn: async () => {
            if (!debouncedQuery || debouncedQuery.trim() === '') return [];

            const response = await fetch(`/api/searchArtists?query=${encodeURIComponent(debouncedQuery)}`);
            if (!response.ok) {
                throw new Error('Search failed');
            }
            return response.json();
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

    const handleResultClick = (result: SearchResult) => {
        setShowResults(false);
        setQuery('');

        if (result.isSpotifyOnly) {
            // Read-only mode - can't add artists
            return;
        }

        if (result.id) {
            router.push(`/artist/${result.id}`);
        }
    };

    return (
        <div className="relative w-full max-w-lg mx-auto">
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
                    {results.map((result, index) => (
                        <button
                            key={result.isSpotifyOnly ? `spotify-${result.spotify}` : result.id}
                            onClick={() => handleResultClick(result)}
                            className="w-full p-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                        >
                            {result.images && result.images.length > 0 ? (
                                <Image
                                    src={result.images[0].url}
                                    alt={result.name || 'Artist'}
                                    width={48}
                                    height={48}
                                    className="rounded"
                                />
                            ) : (
                                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded" />
                            )}
                            <div className="flex-1">
                                <div className="font-medium text-gray-900 dark:text-white">
                                    {result.name}
                                </div>
                                {result.isSpotifyOnly && (
                                    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        <ExternalLink className="h-3 w-3" />
                                        <span>Authentication required to add</span>
                                    </div>
                                )}
                            </div>
                        </button>
                    ))}
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
