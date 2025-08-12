'use client';

import { useBookmarks } from '@/hooks/useBookmarks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { BookmarkCheck, Trash2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface BookmarksListProps {
  className?: string;
  showTitle?: boolean;
}

export function BookmarksList({ className = '', showTitle = true }: BookmarksListProps) {
  const { bookmarks, loading, error, removeBookmark } = useBookmarks();
  const { toast } = useToast();

  const handleRemoveBookmark = async (artistId: string, artistName: string) => {
    const success = await removeBookmark(artistId);
    if (success) {
      toast({
        title: 'Bookmark removed',
        description: `${artistName} removed from bookmarks`,
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to remove bookmark',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-2">Loading bookmarks...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <BookmarkCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No bookmarks yet</p>
            <p className="text-sm">Start bookmarking artists to see them here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookmarkCheck className="h-5 w-5" />
            Bookmarks ({bookmarks.length})
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="divide-y divide-gray-200">
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
                             <div className="flex items-center gap-3 flex-1 min-w-0">
                 <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                   <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                     <span className="text-gray-500 text-xs">No image</span>
                   </div>
                 </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {bookmark.artist.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Added {new Date(bookmark.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  title="View artist page"
                >
                  <Link href={`/artist/${bookmark.artistId}`}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveBookmark(bookmark.artistId, bookmark.artist.name)}
                  title="Remove bookmark"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

