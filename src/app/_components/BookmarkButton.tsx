'use client';

import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBookmarks } from "@/hooks/useBookmarks";

interface BookmarkButtonProps {
  className?: string;
  artistId: string;
  artistName: string;
  imageUrl?: string;
  userId: string;
}

export default function BookmarkButton({ className, artistId, userId }: BookmarkButtonProps) {
  const saved = useBookmarks(userId);
  const bookmarked = saved.bookmarks.some(item => item.artistId === artistId);

  async function handleClick() {
    try {
      if (bookmarked) await saved.remove(artistId);
      else await saved.add(artistId);
    } catch {
      // The shared hook exposes the error; never show success for a failed write.
    }
  }

  return <div className="space-y-2">
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={!saved.canMutate || !!saved.error}
      aria-pressed={bookmarked}
      title={saved.authorized ? "Saved to your Music Nerd account" : "Sign in to save bookmarks to your account"}
      className={cn(
        "flex min-w-[120px] flex-shrink-0 items-center gap-1.5 rounded-lg border-2 border-pastypink p-1.5 text-sm font-bold transition-colors",
        bookmarked
          ? "bg-pastypink text-gray-950 hover:bg-pastypink/90 hover:text-gray-950"
          : "bg-white text-fuchsia-700 hover:bg-gray-100 hover:text-fuchsia-700",
        className
      )}
    >
      <Bookmark size={18} aria-hidden="true" fill={bookmarked ? "currentColor" : "none"} />
      {saved.isSaving ? "Saving…" : saved.isLoading ? "Loading…" : bookmarked ? "Bookmarked" : "Bookmark"}
    </Button>
    {(saved.error || saved.importWarning) && <div role="alert" className="max-w-xs text-xs text-red-700 dark:text-red-300">
      {saved.error || saved.importWarning} <button type="button" className="underline" onClick={() => void saved.reload()}>Retry</button>
    </div>}
  </div>;
}
