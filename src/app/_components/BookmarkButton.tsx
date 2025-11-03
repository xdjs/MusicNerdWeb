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

  // Load initial bookmark state
  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(`bookmarks_${userId}`);
      if (raw) {
        const arr = JSON.parse(raw) as { artistId: string }[];
        setBookmarked(arr.some((b) => b.artistId === artistId));
      }
    } catch (e) {
      console.debug('[BookmarkButton] error parsing bookmarks', e);
    }
  }, [userId, artistId]);

  const handleClick = () => {
    if (!userId || typeof window === 'undefined') return; // safety

    setBookmarked((prev) => {
      const newState = !prev;
      try {
        const key = `bookmarks_${userId}`;
        const raw = localStorage.getItem(key);
        let arr: { artistId: string; artistName: string; imageUrl?: string }[] = raw ? JSON.parse(raw) : [];

        if (newState) {
          // add if not present
                      if (!arr.some((b) => b.artistId === artistId)) {
                // Add new bookmark at the *front* so bookmarks are stored in most-recent-first order.
                arr.unshift({ artistId, artistName, imageUrl });
            }
        } else {
          // remove
          arr = arr.filter((b) => b.artistId !== artistId);
        }

        localStorage.setItem(key, JSON.stringify(arr));
        // Notify others
        window.dispatchEvent(new Event('bookmarksUpdated'));
      } catch (e) {
        console.error('[BookmarkButton] error updating bookmarks', e);
      }

      return newState;
    });
  };

  const baseClasses = "flex items-center gap-1.5 rounded-lg p-1.5 text-sm font-bold transition-colors duration-300 w-[120px] flex-shrink-0";

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className={cn(
        baseClasses,
        bookmarked
          ? "bg-pastypink text-white hover:bg-pastypink/90 hover:text-white border-2 border-pastypink"
          : "bg-white text-pastypink border-2 border-pastypink hover:bg-gray-100 hover:text-pastypink",
        className
      )}
    >
      <Bookmark
        size={18}
        className={bookmarked ? "text-white" : "text-pastypink"}
        strokeWidth={2}
      />
      {bookmarked ? "Bookmarked" : "Bookmark"}
    </Button>
  );
} 