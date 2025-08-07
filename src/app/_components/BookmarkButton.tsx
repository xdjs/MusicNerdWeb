'use client';

import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BookmarkButtonProps {
  className?: string;
  artistId: string;
  artistName: string;
  imageUrl?: string;
  userId: string;
}

export default function BookmarkButton({ className, artistId, artistName, imageUrl, userId }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load initial bookmark state from API
  useEffect(() => {
    if (!userId) return;
    
    const checkBookmarkStatus = async () => {
      try {
        const response = await fetch('/api/bookmarks');
        if (response.ok) {
          const data = await response.json();
          const isBookmarked = data.bookmarks?.some((b: any) => b.artistId === artistId);
          setBookmarked(isBookmarked);
        }
      } catch (error) {
        console.debug('[BookmarkButton] error checking bookmark status', error);
      }
    };

    checkBookmarkStatus();
  }, [userId, artistId]);

  const handleClick = async () => {
    if (!userId || loading) return;

    setLoading(true);
    const newState = !bookmarked;

    try {
      if (newState) {
        // Add bookmark
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

        if (response.ok) {
          setBookmarked(true);
          // Notify other components that bookmarks were updated
          window.dispatchEvent(new Event('bookmarksUpdated'));
        } else if (response.status === 409) {
          // Bookmark already exists
          setBookmarked(true);
        } else {
          console.error('[BookmarkButton] Failed to add bookmark');
        }
      } else {
        // Remove bookmark
        const response = await fetch(`/api/bookmarks?artistId=${artistId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setBookmarked(false);
          // Notify other components that bookmarks were updated
          window.dispatchEvent(new Event('bookmarksUpdated'));
        } else {
          console.error('[BookmarkButton] Failed to remove bookmark');
        }
      }
    } catch (error) {
      console.error('[BookmarkButton] error updating bookmark', error);
    } finally {
      setLoading(false);
    }
  };

  const baseClasses = "flex items-center gap-1.5 rounded-lg p-1.5 text-sm font-bold transition-colors duration-300 w-[120px] flex-shrink-0";

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className={cn(
        baseClasses,
        bookmarked
          ? "bg-pastypink text-white hover:bg-pastypink/90 hover:text-white border-2 border-pastypink"
          : "bg-white text-pastypink border-2 border-gray-300 hover:bg-gray-100 hover:text-pastypink",
        loading && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <Bookmark
        size={18}
        className={bookmarked ? "text-white" : "text-pastypink"}
        strokeWidth={2}
      />
      {loading ? "..." : (bookmarked ? "Bookmarked" : "Bookmark")}
    </Button>
  );
} 