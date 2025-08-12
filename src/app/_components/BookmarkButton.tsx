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
}

export function BookmarkButton({
  artistId,
  artistName,
  className = '',
  size = 'default',
}: BookmarkButtonProps) {
  const { isBookmarked, addBookmark, removeBookmark, loading } = useBookmarks();
  const { toast } = useToast();
  const [localLoading, setLocalLoading] = useState(false);

  const bookmarked = isBookmarked(artistId);

  const handleToggleBookmark = async () => {
    console.log('BookmarkButton: Toggling bookmark for', artistId, 'Current state:', bookmarked);
    setLocalLoading(true);
    
    try {
      let success: boolean;
      
      if (bookmarked) {
        console.log('BookmarkButton: Removing bookmark');
        success = await removeBookmark(artistId);
        if (success) {
          toast({
            title: 'Bookmark removed',
            description: `${artistName} removed from bookmarks`,
          });
        }
      } else {
        console.log('BookmarkButton: Adding bookmark');
        success = await addBookmark(artistId);
        if (success) {
          toast({
            title: 'Bookmark added',
            description: `${artistName} added to bookmarks`,
          });
        }
      }

      if (!success) {
        console.error('BookmarkButton: Operation failed');
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
      className={`${className} rounded-full border-2 px-4 py-1 focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors ${bookmarked ? 'bg-pastypink text-white hover:bg-pastypink/90 border-pastypink' : 'bg-white text-pastypink hover:bg-pastypink/10 border-pastypink'}`}
      title={bookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
      ) : bookmarked ? (
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