import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { db } from '@/server/db/drizzle';
import { bookmarks, artists } from '@/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getSpotifyImage, getSpotifyHeaders } from '@/server/utils/queries/externalApiQueries';

// GET /api/bookmarks - Get user's bookmarks
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '3');
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const totalCount = await db
      .select({ count: bookmarks.id })
      .from(bookmarks)
      .where(eq(bookmarks.userId, userId));

    // Get user's bookmarks with artist data, ordered by position
    const userBookmarks = await db
      .select({
        id: bookmarks.id,
        artistId: bookmarks.artistId,
        position: bookmarks.position,
        createdAt: bookmarks.createdAt,
        artist: {
          id: artists.id,
          name: artists.name,
          spotify: artists.spotify,
        }
      })
      .from(bookmarks)
      .innerJoin(artists, eq(bookmarks.artistId, artists.id))
      .where(eq(bookmarks.userId, userId))
      .orderBy(bookmarks.position)
      .limit(limit)
      .offset(offset);

    // Fetch Spotify images for each bookmark
    try {
      const headers = await getSpotifyHeaders();
      const bookmarksWithImages = await Promise.all(
        userBookmarks.map(async (bookmark) => {
          try {
            const imageResult = await getSpotifyImage(bookmark.artist.spotify, bookmark.artist.id, headers);
            return {
              ...bookmark,
              artist: {
                ...bookmark.artist,
                imageUrl: imageResult.artistImage || null,
              }
            };
          } catch (error) {
            console.error(`Failed to fetch image for artist ${bookmark.artist.id}:`, error);
            return {
              ...bookmark,
              artist: {
                ...bookmark.artist,
                imageUrl: null,
              }
            };
          }
        })
      );
      return NextResponse.json({ 
        bookmarks: bookmarksWithImages,
        pagination: {
          page,
          limit,
          total: totalCount.length,
          totalPages: Math.ceil(totalCount.length / limit),
          hasMore: page * limit < totalCount.length
        }
      });
    } catch (error) {
      console.error('Failed to fetch Spotify images:', error);
      // Return bookmarks without images if Spotify API fails
      return NextResponse.json({ 
        bookmarks: userBookmarks.map(bookmark => ({
          ...bookmark,
          artist: {
            ...bookmark.artist,
            imageUrl: null,
          }
        })),
        pagination: {
          page,
          limit,
          total: totalCount.length,
          totalPages: Math.ceil(totalCount.length / limit),
          hasMore: page * limit < totalCount.length
        }
      });
    }
  } catch (error) {
    console.error('[Bookmarks API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/bookmarks - Add a bookmark
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { artistId } = await req.json();
    
    if (!artistId || typeof artistId !== 'string') {
      return NextResponse.json(
        { error: 'Artist ID is required' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Check if artist exists
    const artist = await db
      .select({ id: artists.id })
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    if (artist.length === 0) {
      return NextResponse.json(
        { error: 'Artist not found' },
        { status: 404 }
      );
    }

    // Check if bookmark already exists
    const existingBookmark = await db
      .select({ id: bookmarks.id })
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.artistId, artistId)))
      .limit(1);

    if (existingBookmark.length > 0) {
      return NextResponse.json(
        { error: 'Bookmark already exists' },
        { status: 409 }
      );
    }

    // Get the next position (highest position + 1)
    const maxPositionResult = await db
      .select({ maxPosition: bookmarks.position })
      .from(bookmarks)
      .where(eq(bookmarks.userId, userId))
      .orderBy(desc(bookmarks.position))
      .limit(1);

    const nextPosition = (maxPositionResult[0]?.maxPosition ?? 0) + 1;

    // Create the bookmark
    const [newBookmark] = await db
      .insert(bookmarks)
      .values({
        userId,
        artistId,
        position: nextPosition,
      })
      .returning();

    return NextResponse.json(
      { message: 'Bookmark added successfully', bookmark: newBookmark },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Bookmarks API] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

