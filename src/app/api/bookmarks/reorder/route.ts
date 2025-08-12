import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { db } from '@/server/db/drizzle';
import { bookmarks } from '@/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

// PUT /api/bookmarks/reorder - Reorder bookmarks
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { artistIds } = await req.json();
    const userId = session.user.id;

    if (!Array.isArray(artistIds) || artistIds.length === 0) {
      return NextResponse.json(
        { error: 'Artist IDs array is required' },
        { status: 400 }
      );
    }

    // Verify all bookmarks belong to the user
    const userBookmarks = await db
      .select({ artistId: bookmarks.artistId })
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          inArray(bookmarks.artistId, artistIds)
        )
      );

    if (userBookmarks.length !== artistIds.length) {
      return NextResponse.json(
        { error: 'Some bookmarks not found or do not belong to user' },
        { status: 400 }
      );
    }

    // Update positions based on the new order
    const updatePromises = artistIds.map((artistId, index) => {
      const newPosition = index + 1;
      return db
        .update(bookmarks)
        .set({
          position: newPosition,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(bookmarks.userId, userId),
            eq(bookmarks.artistId, artistId)
          )
        );
    });

    await Promise.all(updatePromises);

    return NextResponse.json(
      { message: 'Bookmarks reordered successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Bookmarks API] Reorder error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

