import { getUserDisplayName as publicUserName } from '@/lib/user/getUserDisplayName';
import { db } from "@/server/db/drizzle";
import { eq } from "drizzle-orm";
import { users } from "@/server/db/schema";

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

// Preserve existing callers while sharing the pure public-name policy.
export function getUserDisplayName(user: Parameters<typeof publicUserName>[0]): string {
    return publicUserName(user);
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
