import { getUserDisplayName as publicUserName } from '@/lib/user/getUserDisplayName';
import { db } from "@/server/db/drizzle";
import { eq, ilike } from "drizzle-orm";
import { users } from "@/server/db/schema";
import { getServerAuthSession } from "@/server/auth";

export async function getUserByWallet(wallet: string) {
    try {
        // Normalize wallet address to lowercase for consistent lookups
        const normalizedWallet = wallet.toLowerCase();
        const result = await withDbRetry(() => db.query.users.findFirst({ where: ilike(users.wallet, normalizedWallet) }));
        return result;
    } catch (error) {
        console.error("error getting user by wallet", error);
        if (error instanceof Error) {
            throw new Error(`Error finding user: ${error.message}`);
        }
        throw new Error("Error finding user: Unknown error");
    }
}

export async function getUserById(id: string) {
    try {
        const result = await withDbRetry(() => db.query.users.findFirst({ where: eq(users.id, id) }));
        return result;
    } catch (error) {
        console.error("error getting user by Id", error);
        if (error instanceof Error) {
            throw new Error(`Error finding user: ${error.message}`);
        }
        throw new Error("Error finding user: Unknown error");
    }
}

// Lightweight retry helper for transient DB errors (timeouts, resets)
async function withDbRetry<T>(operation: () => Promise<T>, retries: number = 2, delayMs: number = 300): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        const message = (error && (error.message || error.toString())) as string;
        const code = (error && (error.code || error.errno)) as string | undefined;
        const isTransient =
            code === 'CONNECT_TIMEOUT' ||
            /ETIMEDOUT|ECONNRESET|EHOSTUNREACH|ENETUNREACH|Connection terminated unexpectedly/i.test(message);
        if (retries > 0 && isTransient) {
            await new Promise((r) => setTimeout(r, delayMs));
            return withDbRetry(operation, retries - 1, delayMs * 2);
        }
        throw error;
    }
}

export async function createUser(wallet: string) {
    try {
        const [newUser] = await db.insert(users).values({ wallet }).returning();
        return newUser;
    } catch (e) {
        console.error("error creating user", e);
        throw new Error("Error creating user");
    }
}

// Preserve existing callers while sharing the pure public-name policy.
export function getUserDisplayName(user: Parameters<typeof publicUserName>[0]): string {
    return publicUserName(user);
}

export async function getAllUsers() {
    const session = await getServerAuthSession();
    if (!session) throw new Error("Unauthorized");
    try {
        const result = await db.query.users.findMany();
        return result ?? [];
    } catch (e) {
        console.error("error getting all users", e);
        throw new Error("Error getting all users");
    }
}

// ============================================================================
// Privy Authentication Functions
// ============================================================================

// Get user by Privy ID
export async function getUserByPrivyId(privyUserId: string) {
    try {
        const result = await withDbRetry(() =>
            db.query.users.findFirst({ where: eq(users.privyUserId, privyUserId) })
        );
        return result;
    } catch (error) {
        console.error("error getting user by Privy ID", error);
        if (error instanceof Error) {
            throw new Error(`Error finding user: ${error.message}`);
        }
        throw new Error("Error finding user: Unknown error");
    }
}

// Create user from Privy login
export async function createUserFromPrivy(data: {
    privyUserId: string;
    email?: string;
}) {
    if (process.env.NODE_ENV === 'development') {
        console.log('[createUserFromPrivy] Starting with data:', {
            privyUserId: data.privyUserId,
            email: data.email,
        });
    }
    try {
        const [newUser] = await db
            .insert(users)
            .values({
                privyUserId: data.privyUserId,
                email: data.email,
                username: null,
                isWhiteListed: false,
                isAdmin: false,
                isSuperAdmin: false,
                isHidden: false,
            })
            .returning();
        if (process.env.NODE_ENV === 'development') {
            console.log('[createUserFromPrivy] User created successfully:', {
                id: newUser?.id,
                privyUserId: newUser?.privyUserId,
                email: newUser?.email,
            });
        }
        return newUser;
    } catch (e) {
        console.error("[createUserFromPrivy] Database error:", e);
        throw new Error(`Error creating user from Privy: ${(e as Error)?.message}`);
    }
}

// Update user with Privy ID (for legacy account linking)
export async function updateUserPrivyId(userId: string, privyUserId: string) {
    try {
        const now = new Date().toISOString();
        const [updatedUser] = await db
            .update(users)
            .set({
                privyUserId,
                updatedAt: now,
            })
            .where(eq(users.id, userId))
            .returning();
        return updatedUser;
    } catch (e) {
        console.error("error updating user Privy ID", e);
        throw new Error("Error updating user Privy ID");
    }
}
