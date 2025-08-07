'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type BookmarkContextType = {
  bookmarks: Set<string>; // Set of bookmarked artist IDs
  isBookmarked: (artistId: string) => boolean;
  addBookmark: (artistId: string, artistName: string, imageUrl?: string) => Promise<boolean>;
  removeBookmark: (artistId: string) => Promise<boolean>;
  refreshBookmarks: () => Promise<void>;
  loading: boolean;
};

const BookmarkContext = createContext<BookmarkContextType | null>(null);

export function useBookmarks() {
  const context = useContext(BookmarkContext);
  if (!context) {
    throw new Error('useBookmarks must be used within a BookmarkProvider');
  }
  return context;
}

interface BookmarkProviderProps {
  children: React.ReactNode;
  userId?: string;
}

export function BookmarkProvider({ children, userId }: BookmarkProviderProps) {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const refreshBookmarks = useCallback(async () => {
    if (!userId) {
      setBookmarks(new Set());
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/bookmarks');
      if (response.ok) {
        const data = await response.json();
        const bookmarkIds = new Set<string>(data.bookmarks?.map((b: any) => b.artistId) || []);
        setBookmarks(bookmarkIds);
      }
    } catch (error) {
      console.debug('[BookmarkProvider] error fetching bookmarks', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const isBookmarked = useCallback((artistId: string) => {
    return bookmarks.has(artistId);
  }, [bookmarks]);

  const addBookmark = useCallback(async (artistId: string, artistName: string, imageUrl?: string) => {
    if (!userId) return false;

    try {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          artistId,
          artistName,
          imageUrl,
        }),
      });

      if (response.ok || response.status === 409) {
        // Update local state immediately for better UX
        setBookmarks(prev => new Set(prev).add(artistId));
        // Notify other components
        window.dispatchEvent(new Event('bookmarksUpdated'));
        return true;
      }
      return false;
    } catch (error) {
      console.error('[BookmarkProvider] error adding bookmark', error);
      return false;
    }
  }, [userId]);

  const removeBookmark = useCallback(async (artistId: string) => {
    if (!userId) return false;

    try {
      const response = await fetch(`/api/bookmarks?artistId=${artistId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Update local state immediately for better UX
        setBookmarks(prev => {
          const newSet = new Set(prev);
          newSet.delete(artistId);
          return newSet;
        });
        // Notify other components
        window.dispatchEvent(new Event('bookmarksUpdated'));
        return true;
      }
      return false;
    } catch (error) {
      console.error('[BookmarkProvider] error removing bookmark', error);
      return false;
    }
  }, [userId]);

  // Load bookmarks on mount and when userId changes
  useEffect(() => {
    refreshBookmarks();
  }, [refreshBookmarks]);

  // Listen for bookmark updates from other sources
  useEffect(() => {
    const handleBookmarkUpdate = () => {
      refreshBookmarks();
    };

    window.addEventListener('bookmarksUpdated', handleBookmarkUpdate);
    return () => {
      window.removeEventListener('bookmarksUpdated', handleBookmarkUpdate);
    };
  }, [refreshBookmarks]);

  const value: BookmarkContextType = {
    bookmarks,
    isBookmarked,
    addBookmark,
    removeBookmark,
    refreshBookmarks,
    loading,
  };

  return (
    <BookmarkContext.Provider value={value}>
      {children}
    </BookmarkContext.Provider>
  );
}
