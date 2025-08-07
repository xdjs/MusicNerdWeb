'use client';

import { useState, useEffect } from 'react';

interface UseBookmarkStatusOptions {
  artistIds: string[];
  userId?: string;
}

export function useBookmarkStatus({ artistIds, userId }: UseBookmarkStatusOptions) {
  const [bookmarkedArtists, setBookmarkedArtists] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || artistIds.length === 0) {
      setBookmarkedArtists(new Set());
      return;
    }

    const fetchBookmarkStatus = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/bookmarks?all=true');
        if (response.ok) {
          const data = await response.json();
          const bookmarkedIds = new Set<string>(
            data.bookmarks?.map((b: any) => b.artistId) || []
          );
          setBookmarkedArtists(bookmarkedIds);
        }
      } catch (error) {
        console.debug('[useBookmarkStatus] error fetching bookmark status', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookmarkStatus();

    // Listen for bookmark updates
    const handleBookmarkUpdate = () => {
      fetchBookmarkStatus();
    };

    window.addEventListener('bookmarksUpdated', handleBookmarkUpdate);
    return () => {
      window.removeEventListener('bookmarksUpdated', handleBookmarkUpdate);
    };
  }, [userId, artistIds.join(',')]);

  return {
    isBookmarked: (artistId: string) => bookmarkedArtists.has(artistId),
    loading,
  };
}
