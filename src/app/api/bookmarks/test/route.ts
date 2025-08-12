import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { db } from '@/server/db/drizzle';
import { bookmarks, artists, users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/bookmarks/test - Test database connection and table structure
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

    // Test 1: Check if user exists
    const userCheck = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Test 2: Check bookmarks table structure
    const bookmarksCheck = await db
      .select({ count: bookmarks.id })
      .from(bookmarks)
      .where(eq(bookmarks.userId, userId))
      .limit(1);

    // Test 3: Check if we can query artists table
    const artistsCheck = await db
      .select({ count: artists.id })
      .from(artists)
      .limit(1);

    return NextResponse.json({
      success: true,
      tests: {
        userExists: userCheck.length > 0,
        userBookmarksCount: bookmarksCheck.length,
        artistsTableAccessible: artistsCheck.length > 0,
        userId: userId
      }
    });
  } catch (error) {
    console.error('[Bookmarks Test API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Database test failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
