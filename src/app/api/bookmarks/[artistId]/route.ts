import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { db } from '@/server/db/drizzle';
import { bookmarks } from '@/server/db/schema';
import { eq, and, sql, gt } from 'drizzle-orm';

// DELETE /api/bookmarks/[artistId] - Remove a bookmark
export async function DELETE(
  req: NextRequest,
  { params }: { params: { artistId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { artistId } = params;
    const userId = session.user.id;

    if (!artistId) {
      return NextResponse.json(
        { error: 'Artist ID is required' },
        { status: 400 }
      );
    }

    // Check if bookmark exists
    const existingBookmark = await db
      .select({ id: bookmarks.id, position: bookmarks.position })
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.artistId, artistId)))
      .limit(1);

    if (existingBookmark.length === 0) {
      return NextResponse.json(
        { error: 'Bookmark not found' },
        { status: 404 }
      );
    }

    const deletedPosition = existingBookmark[0].position;

    // Delete the bookmark
    await db
      .delete(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.artistId, artistId)));

    // Reorder remaining bookmarks to fill the gap
    await db
      .update(bookmarks)
      .set({
        position: sql`${bookmarks.position} - 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(bookmarks.userId, userId),
          gt(bookmarks.position, deletedPosition)
        )
      );

    return NextResponse.json(
      { message: 'Bookmark removed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Bookmarks API] DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

