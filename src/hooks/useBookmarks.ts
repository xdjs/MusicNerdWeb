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
                imageUrl: string;
              };
}

export interface UseBookmarksReturn {
  bookmarks: Bookmark[];
  loading: boolean;
  error: string | null;
  addBookmark: (artistId: string) => Promise<boolean>;
  removeBookmark: (artistId: string) => Promise<boolean>;
  reorderBookmarks: (artistIds: string[]) => Promise<boolean>;
  refreshBookmarks: () => Promise<void>;
}

export function useBookmarks(): UseBookmarksReturn {
  const { data: session } = useSession();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookmarks = useCallback(async () => {
    if (!session?.user?.id) {
      setBookmarks([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/bookmarks');
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Please log in to view bookmarks');
        } else {
          setError('Failed to load bookmarks');
        }
        return;
      }

      const data = await response.json();
      setBookmarks(data.bookmarks || []);
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

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ artistId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          setError('Artist is already bookmarked');
        } else if (response.status === 404) {
          setError('Artist not found');
        } else {
          setError(errorData.error || 'Failed to add bookmark');
        }
        return false;
      }

      // Refresh bookmarks to get the updated list
      await fetchBookmarks();
      return true;
    } catch (err) {
      console.error('Error adding bookmark:', err);
      setError('Failed to add bookmark');
      return false;
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, fetchBookmarks]);

  const removeBookmark = useCallback(async (artistId: string): Promise<boolean> => {
    if (!session?.user?.id) {
      setError('Please log in to remove bookmarks');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/bookmarks/${artistId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to remove bookmark');
        return false;
      }

      // Refresh bookmarks to get the updated list
      await fetchBookmarks();
      return true;
    } catch (err) {
      console.error('Error removing bookmark:', err);
      setError('Failed to remove bookmark');
      return false;
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, fetchBookmarks]);

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
        const errorData = await response.json();
        setError(errorData.error || 'Failed to reorder bookmarks');
        return false;
      }

      // Refresh bookmarks to get the updated list
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
    await fetchBookmarks();
  }, [fetchBookmarks]);

  // Fetch bookmarks when session changes
  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  return {
    bookmarks,
    loading,
    error,
    addBookmark,
    removeBookmark,
    reorderBookmarks,
    refreshBookmarks,
  };
}

