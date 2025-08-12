'use client';

import { useState } from 'react';
import { useBookmarks } from '@/hooks/useBookmarks';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Bookmark, BookmarkCheck } from 'lucide-react';

interface BookmarkButtonProps {
  artistId: string;
  artistName: string;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export function BookmarkButton({
  artistId,
  artistName,
  className = '',
  size = 'default',
  variant = 'outline',
}: BookmarkButtonProps) {
  const { bookmarks, addBookmark, removeBookmark, loading } = useBookmarks();
  const { toast } = useToast();
  const [localLoading, setLocalLoading] = useState(false);

  const isBookmarked = bookmarks.some(bookmark => bookmark.artistId === artistId);

  const handleToggleBookmark = async () => {
    setLocalLoading(true);
    
    try {
      let success: boolean;
      
      if (isBookmarked) {
        success = await removeBookmark(artistId);
        if (success) {
          toast({
            title: 'Bookmark removed',
            description: `${artistName} removed from bookmarks`,
          });
        }
      } else {
        success = await addBookmark(artistId);
        if (success) {
          toast({
            title: 'Bookmark added',
            description: `${artistName} added to bookmarks`,
          });
        }
      }

      if (!success) {
        toast({
          title: 'Error',
          description: 'Failed to update bookmark',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast({
        title: 'Error',
        description: 'Failed to update bookmark',
        variant: 'destructive',
      });
    } finally {
      setLocalLoading(false);
    }
  };

  const isLoading = loading || localLoading;

  return (
    <Button
      onClick={handleToggleBookmark}
      disabled={isLoading}
      size={size}
      variant={variant}
      className={`${className} ${isBookmarked ? 'bg-pastypink text-white hover:bg-pastypink/90' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
      title={isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
      ) : isBookmarked ? (
        <>
          <BookmarkCheck className="h-4 w-4 mr-2" />
          Bookmarked
        </>
      ) : (
        <>
          <Bookmark className="h-4 w-4 mr-2" />
          Bookmark
        </>
      )}
    </Button>
  );
} 