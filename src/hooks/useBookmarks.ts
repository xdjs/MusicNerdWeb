import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export interface Bookmark {
  id: string;
  artistId: string;
  position: number;
  createdAt: string;
  artist: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface UseBookmarksReturn {
  bookmarks: Bookmark[];
  loading: boolean;
  error: string | null;
  pagination: PaginationInfo | null;
  addBookmark: (artistId: string) => Promise<boolean>;
  removeBookmark: (artistId: string) => Promise<boolean>;
  reorderBookmarks: (artistIds: string[]) => Promise<boolean>;
  refreshBookmarks: () => Promise<void>;
  loadMoreBookmarks: () => Promise<void>;
  isBookmarked: (artistId: string) => boolean;
}

export function useBookmarks(): UseBookmarksReturn {
  const { data: session } = useSession();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Helper function to check if an artist is bookmarked (like localStorage version)
  const isBookmarked = useCallback((artistId: string): boolean => {
    return bookmarks.some(bookmark => bookmark.artistId === artistId);
  }, [bookmarks]);

  const fetchBookmarks = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!session?.user?.id) {
      setBookmarks([]);
      setLoading(false);
      setError(null);
      setPagination(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/bookmarks?page=${page}&limit=3`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Please log in to view bookmarks');
        } else {
          setError('Failed to load bookmarks');
        }
        return;
      }

      const data = await response.json();
      
      if (append) {
        setBookmarks(prev => [...prev, ...(data.bookmarks || [])]);
      } else {
        setBookmarks(data.bookmarks || []);
      }
      
      setPagination(data.pagination || null);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
      setError('Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  const addBookmark = useCallback(async (artistId: string): Promise<boolean> => {
    if (!session?.user?.id) {
      setError('Please log in to add bookmarks');
      return false;
    }

    // Optimistic update - add to state immediately (like localStorage)
    const optimisticBookmark: Bookmark = {
      id: `temp-${Date.now()}`,
      artistId,
      position: bookmarks.length + 1,
      createdAt: new Date().toISOString(),
      artist: {
        id: artistId,
        name: 'Loading...',
        imageUrl: null,
      }
    };

    setBookmarks(prev => [...prev, optimisticBookmark]);

    try {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ artistId }),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        setBookmarks(prev => prev.filter(b => b.id !== optimisticBookmark.id));
        
        let errorMessage = 'Failed to add bookmark';
        try {
          const errorData = await response.json();
          if (response.status === 409) {
            errorMessage = 'Artist is already bookmarked';
          } else if (response.status === 404) {
            errorMessage = 'Artist not found';
          } else {
            errorMessage = errorData.error || 'Failed to add bookmark';
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        setError(errorMessage);
        return false;
      }

      // Refresh bookmarks to get the real data
      await fetchBookmarks();
      return true;
    } catch (err) {
      // Revert optimistic update on error
      setBookmarks(prev => prev.filter(b => b.id !== optimisticBookmark.id));
      console.error('Error adding bookmark:', err);
      setError('Failed to add bookmark');
      return false;
    }
  }, [session?.user?.id, bookmarks.length, fetchBookmarks]);

  const removeBookmark = useCallback(async (artistId: string): Promise<boolean> => {
    if (!session?.user?.id) {
      setError('Please log in to remove bookmarks');
      return false;
    }

    // Optimistic update - remove from state immediately (like localStorage)
    const bookmarkToRemove = bookmarks.find(b => b.artistId === artistId);
    setBookmarks(prev => prev.filter(b => b.artistId !== artistId));

    try {
      const response = await fetch(`/api/bookmarks/${artistId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // Revert optimistic update on error
        if (bookmarkToRemove) {
          setBookmarks(prev => [...prev, bookmarkToRemove]);
        }
        
        let errorMessage = 'Failed to remove bookmark';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || 'Failed to remove bookmark';
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        setError(errorMessage);
        return false;
      }

      // Refresh bookmarks to get updated data
      await fetchBookmarks();
      return true;
    } catch (err) {
      // Revert optimistic update on error
      if (bookmarkToRemove) {
        setBookmarks(prev => [...prev, bookmarkToRemove]);
      }
      console.error('Error removing bookmark:', err);
      setError('Failed to remove bookmark');
      return false;
    }
  }, [session?.user?.id, bookmarks, fetchBookmarks]);

  const reorderBookmarks = useCallback(async (artistIds: string[]): Promise<boolean> => {
    if (!session?.user?.id) {
      setError('Please log in to reorder bookmarks');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/bookmarks/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ artistIds }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to reorder bookmarks';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || 'Failed to reorder bookmarks';
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        setError(errorMessage);
        return false;
      }

      // Refresh bookmarks to get the updated order
      await fetchBookmarks();
      return true;
    } catch (err) {
      console.error('Error reordering bookmarks:', err);
      setError('Failed to reorder bookmarks');
      return false;
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, fetchBookmarks]);

  const refreshBookmarks = useCallback(async () => {
    await fetchBookmarks(1, false);
  }, [fetchBookmarks]);

  const loadMoreBookmarks = useCallback(async () => {
    if (pagination?.hasMore) {
      await fetchBookmarks(currentPage + 1, true);
    }
  }, [fetchBookmarks, pagination?.hasMore, currentPage]);

  // Load bookmarks when session changes
  useEffect(() => {
    if (session?.user?.id) {
      fetchBookmarks(1, false);
    } else {
      setBookmarks([]);
      setLoading(false);
      setError(null);
      setPagination(null);
    }
  }, [session?.user?.id, fetchBookmarks]);

  return {
    bookmarks,
    loading,
    error,
    pagination,
    addBookmark,
    removeBookmark,
    reorderBookmarks,
    refreshBookmarks,
    loadMoreBookmarks,
    isBookmarked,
  };
}

