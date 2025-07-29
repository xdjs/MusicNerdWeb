'use client';

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function BookmarkButton({ className }: { className?: string }) {
  const [bookmarked, setBookmarked] = useState(false);

  const handleClick = () => {
    setBookmarked((prev) => !prev);
  };

  const baseClasses = "flex items-center gap-1 rounded-lg px-4 py-1 text-sm font-medium transition-colors duration-300";

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className={cn(
        baseClasses,
        bookmarked
          ? "bg-pastypink text-white hover:bg-pastypink/90"
          : "bg-white text-pastypink border-2 border-pastypink hover:bg-gray-100",
        className
      )}
    >
      <Bookmark
        size={16}
        className={bookmarked ? "text-white" : "text-pastypink"}
        strokeWidth={2}
      />
      {bookmarked ? "Bookmarked" : "Bookmark"}
    </Button>
  );
} 