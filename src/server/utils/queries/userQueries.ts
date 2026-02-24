import { db } from "@/server/db/drizzle";
import { eq, ilike, inArray, sql } from "drizzle-orm";
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

export async function getWhitelistedUsers() {
    const session = await getServerAuthSession();
    if (!session) throw new Error("Unauthorized");
    try {
        const result = await db.query.users.findMany({ where: eq(users.isWhiteListed, true) });
        return result ?? [];
    } catch (e) {
        console.error("error getting whitelisted users", e);
        throw new Error("Error getting whitelisted users");
    }
}

export async function removeFromWhitelist(userIds: string[]) {
    try {
        const now = new Date().toISOString();
        await db.update(users).set({ isWhiteListed: false, updatedAt: now }).where(inArray(users.id, userIds));
    } catch (e) {
        console.error("error removing from whitelist", e);
    }
}

export type AddUsersToWhitelistResp = {
    status: "success" | "error";
    message: string;
};

export async function addUsersToWhitelist(walletAddresses: string[]): Promise<AddUsersToWhitelistResp> {
    try {
        // Update by wallet addresses
        if (walletAddresses.length) {
            const now = new Date().toISOString();
            await db.update(users).set({ isWhiteListed: true, updatedAt: now }).where(inArray(users.wallet, walletAddresses));
            // Also update by username matches
            await db.update(users).set({ isWhiteListed: true, updatedAt: now }).where(inArray(users.username, walletAddresses));
        }
        return { status: "success", message: "Users added to whitelist" };
    } catch (e) {
        console.error("error adding users to whitelist", e);
        return { status: "error", message: "Error adding users to whitelist" };
    }
}

export async function searchForUsersByWallet(wallet: string) {
    try {
        const result = await db.query.users.findMany({
            where: ilike(users.wallet, `%${wallet}%`) ,
        });
        const resultUsername = await db.query.users.findMany({
            where: ilike(users.username, `%${wallet}%`),
        });
        const values = [...result.map((u)=>u.wallet), ...resultUsername.map((u)=>u.username??"")].filter(Boolean);
        // deduplicate
        return Array.from(new Set(values));
    } catch (e) {
        console.error("searching for users", e);
    }
}

export type UpdateWhitelistedUserResp = {
    status: "success" | "error";
    message: string;
};

// Updates a whitelisted user's editable fields (wallet, email, username, roles)
export async function updateWhitelistedUser(
    userId: string,
    data: { wallet?: string; email?: string; username?: string; isAdmin?: boolean; isWhiteListed?: boolean; isHidden?: boolean }
): Promise<UpdateWhitelistedUserResp> {
    try {
        if (!userId) throw new Error("Invalid user id");
        const updateData: Record<string, string | boolean> = {};
        if (data.wallet !== undefined) updateData.wallet = data.wallet;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.username !== undefined) updateData.username = data.username;

        // Handle role flag changes
        if (data.isAdmin !== undefined) {
            updateData.isAdmin = data.isAdmin;
            // Auto-whitelist admins
            if (data.isAdmin) {
                updateData.isWhiteListed = true;
            }
        }
        
        if (data.isWhiteListed !== undefined && data.isAdmin !== true) {
            // Only update whitelist if not overridden by admin logic above
            updateData.isWhiteListed = data.isWhiteListed;
        }

        // Handle hidden role flag
        if (data.isHidden !== undefined) {
            updateData.isHidden = data.isHidden;
        }

        if (Object.keys(updateData).length === 0) {
            return { status: "error", message: "No fields to update" };
        }

        await db.update(users).set(updateData).where(eq(users.id, userId));
        return { status: "success", message: "User updated successfully" };
    } catch (e) {
        console.error("error updating whitelisted user", e);
        return { status: "error", message: "Error updating user" };
    }
}

export type AddUsersToAdminResp = {
    status: "success" | "error";
    message: string;
};

export async function addUsersToAdmin(walletAddresses: string[]): Promise<AddUsersToAdminResp> {
    try {
        if (walletAddresses.length) {
            const now = new Date().toISOString();
            // Admin users should automatically be whitelisted as well
            await db.update(users).set({ isAdmin: true, isWhiteListed: true, updatedAt: now }).where(inArray(users.wallet, walletAddresses));
            await db.update(users).set({ isAdmin: true, isWhiteListed: true, updatedAt: now }).where(inArray(users.username, walletAddresses));
        }
        return { status: "success", message: "Users granted admin access" };
    } catch (e) {
        console.error("error adding users to admin", e);
        return { status: "error", message: "Error adding users to admin" };
    }
}

export async function removeFromAdmin(userIds: string[]) {
    try {
        const now = new Date().toISOString();
        await db.update(users).set({ isAdmin: false, updatedAt: now }).where(inArray(users.id, userIds));
    } catch (e) {
        console.error("error removing admin privileges", e);
    }
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

export type AddUsersToHiddenResp = {
    status: "success" | "error";
    message: string;
};

export async function addUsersToHidden(walletAddresses: string[]): Promise<AddUsersToHiddenResp> {
    try {
        if (walletAddresses.length) {
            const now = new Date().toISOString();
            await db.update(users).set({ isHidden: true, updatedAt: now }).where(inArray(users.wallet, walletAddresses));
            await db.update(users).set({ isHidden: true, updatedAt: now }).where(inArray(users.username, walletAddresses));
        }
        return { status: "success", message: "Users hidden from leaderboards" };
    } catch (e) {
        console.error("error hiding users", e);
        return { status: "error", message: "Error hiding users" };
    }
}

export async function removeFromHidden(userIds: string[]) {
    try {
        const now = new Date().toISOString();
        await db.update(users).set({ isHidden: false, updatedAt: now }).where(inArray(users.id, userIds));
    } catch (e) {
        console.error("error unhiding users", e);
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
                username: data.email,
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

// Backfill username from email for existing users who have no username
export async function backfillUsernameFromEmail(userId: string, email: string) {
    try {
        await db
            .update(users)
            .set({ username: email, updatedAt: new Date().toISOString() })
            .where(eq(users.id, userId));
    } catch (e) {
        console.error("[backfillUsernameFromEmail] Database error:", e);
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

// Wallet address validation regex
const WALLET_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

// Link wallet to user
export async function linkWalletToUser(userId: string, walletAddress: string) {
    // Validate wallet address format
    if (!WALLET_ADDRESS_REGEX.test(walletAddress)) {
        throw new Error("Invalid wallet address format");
    }

    try {
        const now = new Date().toISOString();
        const [updatedUser] = await db
            .update(users)
            .set({
                wallet: walletAddress.toLowerCase(),
                updatedAt: now,
            })
            .where(eq(users.id, userId))
            .returning();
        return updatedUser;
    } catch (e) {
        console.error("error linking wallet to user", e);
        throw new Error("Error linking wallet to user");
    }
}

// Merge accounts (legacy wallet user into current Privy user)
export async function mergeAccounts(
    currentUserId: string,
    legacyUserId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const now = new Date().toISOString();

        // Perform all operations in a single transaction to prevent TOCTOU race conditions
        const result = await db.transaction(async (tx) => {
            // Get both users inside transaction to ensure consistency
            const currentUser = await tx.query.users.findFirst({
                where: eq(users.id, currentUserId)
            });

            const legacyUser = await tx.query.users.findFirst({
                where: eq(users.id, legacyUserId)
            });

            if (!currentUser || !legacyUser) {
                return { success: false as const, error: 'User not found' };
            }

            if (!currentUser.privyUserId) {
                return { success: false as const, error: 'Current user has no Privy ID' };
            }

            // Clear privyUserId from placeholder first to avoid unique constraint violation
            await tx
                .update(users)
                .set({ privyUserId: null })
                .where(eq(users.id, currentUserId));

            // Update legacy user with Privy ID and merged data
            await tx
                .update(users)
                .set({
                    privyUserId: currentUser.privyUserId,
                    email: currentUser.email || legacyUser.email,
                    acceptedUgcCount: (legacyUser.acceptedUgcCount || 0) +
                        (currentUser.acceptedUgcCount || 0),
                    updatedAt: now,
                })
                .where(eq(users.id, legacyUserId));

            // Update foreign keys: artists.addedBy
            await tx.execute(sql`
                UPDATE artists
                SET added_by = ${legacyUserId}
                WHERE added_by = ${currentUserId}
            `);

            // Update foreign keys: ugcresearch.userId
            await tx.execute(sql`
                UPDATE ugcresearch
                SET user_id = ${legacyUserId}
                WHERE user_id = ${currentUserId}
            `);

            // Delete the current (placeholder) user
            await tx
                .delete(users)
                .where(eq(users.id, currentUserId));

            return { success: true as const };
        });

        return result;
    } catch (error) {
        console.error('[Merge] Account merge failed:', error);
        return { success: false, error: 'Merge failed' };
    }
} 