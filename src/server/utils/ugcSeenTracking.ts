import { db } from "@/server/db/drizzle";
import { ugcresearch } from "@/server/db/schema";
import { eq, and, gt } from "drizzle-orm";

// Special marker used in ugcresearch.site_name to store user's last seen timestamp
// Following the same pattern as the Discord notifier sentinel rows
const SENTINEL_SITE_NAME = "user_last_seen_approved";

/**
 * Gets the timestamp when the user last marked their approved UGC as "seen"
 * Uses sentinel rows in ugcresearch table (similar to Discord notifier pattern)
 * 
 * @param userId - The user's ID
 * @returns Date of last seen timestamp, or null if never seen
 */
export async function getUserLastSeenTimestamp(userId: string): Promise<Date | null> {
  try {
    const sentinel = await db.query.ugcresearch.findFirst({
      where: and(
        eq(ugcresearch.siteName, SENTINEL_SITE_NAME),
        eq(ugcresearch.userId, userId)
      ),
    });
    
    return sentinel?.createdAt ? new Date(sentinel.createdAt) : null;
  } catch (e) {
    console.error("[getUserLastSeenTimestamp] error", e);
    return null;
  }
}

/**
 * Updates the user's last seen timestamp using a sentinel row
 * Creates a new sentinel row if none exists, updates existing one otherwise
 * 
 * @param userId - The user's ID
 * @returns Promise that resolves when timestamp is updated
 */
export async function updateUserLastSeenTimestamp(userId: string): Promise<void> {
  try {
    const now = new Date().toISOString();
    
    // Check if sentinel row already exists for this user
    const existingSentinel = await db.query.ugcresearch.findFirst({
      where: and(
        eq(ugcresearch.siteName, SENTINEL_SITE_NAME),
        eq(ugcresearch.userId, userId)
      ),
    });

    if (existingSentinel) {
      // Update existing sentinel row's timestamp
      await db
        .update(ugcresearch)
        .set({ createdAt: now })
        .where(eq(ugcresearch.id, existingSentinel.id));
    } else {
      // Create new sentinel row for this user
      await db.insert(ugcresearch).values({
        siteName: SENTINEL_SITE_NAME,
        userId: userId,
        createdAt: now,
        accepted: true, // Set to true so it doesn't appear in pending UGC
      });
    }
  } catch (e) {
    console.error("[updateUserLastSeenTimestamp] error", e);
    throw new Error("Failed to update user last seen timestamp");
  }
}

/**
 * Gets count of UGC approved after the user's last seen timestamp
 * This provides more granular tracking than just the count difference
 * 
 * @param userId - The user's ID
 * @returns Count of UGC approved since last seen timestamp
 */
export async function getApprovedSinceLastSeen(userId: string): Promise<number> {
  try {
    const lastSeenTimestamp = await getUserLastSeenTimestamp(userId);
    
    if (!lastSeenTimestamp) {
      // User has never marked anything as seen, count all approved UGC
      const allApproved = await db.query.ugcresearch.findMany({
        where: and(
          eq(ugcresearch.userId, userId),
          eq(ugcresearch.accepted, true)
        ),
        columns: { id: true },
      });
      return allApproved.length;
    }

    // Count approved UGC with dateProcessed after last seen timestamp
    const newApprovals = await db.query.ugcresearch.findMany({
      where: and(
        eq(ugcresearch.userId, userId),
        eq(ugcresearch.accepted, true),
        // Only count items processed after user's last seen timestamp
        gt(ugcresearch.dateProcessed, lastSeenTimestamp.toISOString())
      ),
      columns: { id: true },
    });

    return newApprovals.length;
  } catch (e) {
    console.error("[getApprovedSinceLastSeen] error", e);
    return 0;
  }
}
