import { db } from "@/server/db/drizzle";
import { eq, ilike, inArray } from "drizzle-orm";
import { users } from "@/server/db/schema";
import { getServerAuthSession } from "@/server/auth";

// -----------------------------
// Basic user helpers
// -----------------------------
export async function getUserByWallet(wallet: string) {
  try {
    return await db.query.users.findFirst({ where: eq(users.wallet, wallet) });
  } catch (e) {
    console.error("error getting user by wallet", e);
    throw new Error("Error finding user");
  }
}

export async function getUserById(id: string) {
  try {
    return await db.query.users.findFirst({ where: eq(users.id, id) });
  } catch (e) {
    console.error("error getting user by Id", e);
    throw new Error("Error finding user");
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

// -----------------------------
// Whitelist helpers
// -----------------------------
export async function getWhitelistedUsers() {
  const walletlessEnabled = process.env.NEXT_PUBLIC_DISABLE_WALLET_REQUIREMENT === "true" && process.env.NODE_ENV !== "production";
  const session = await getServerAuthSession();
  if (!session && !walletlessEnabled) throw new Error("Unauthorized");
  try {
    return (await db.query.users.findMany({ where: eq(users.isWhiteListed, true) })) ?? [];
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

export type AddUsersToWhitelistResp = { status: "success" | "error"; message: string };

export async function addUsersToWhitelist(walletAddresses: string[]): Promise<AddUsersToWhitelistResp> {
  try {
    if (walletAddresses.length) {
      const now = new Date().toISOString();
      await db.update(users).set({ isWhiteListed: true, updatedAt: now }).where(inArray(users.wallet, walletAddresses));
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
    const result = await db.query.users.findMany({ where: ilike(users.wallet, `%${wallet}%`) });
    const resultUsername = await db.query.users.findMany({ where: ilike(users.username, `%${wallet}%`) });
    const merged = [...result.map(u => u.wallet), ...resultUsername.map(u => u.username ?? "")].filter(Boolean);
    return Array.from(new Set(merged));
  } catch (e) {
    console.error("searching for users", e);
  }
}

export type UpdateWhitelistedUserResp = { status: "success" | "error"; message: string };
export async function updateWhitelistedUser(userId: string, data: { wallet?: string; email?: string; username?: string }): Promise<UpdateWhitelistedUserResp> {
  try {
    if (!userId) return { status: "error", message: "Invalid user id" };
    const updateData: Record<string, string> = {};
    if (data.wallet !== undefined) updateData.wallet = data.wallet;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.username !== undefined) updateData.username = data.username;
    if (Object.keys(updateData).length === 0) return { status: "error", message: "No fields to update" };
    await db.update(users).set(updateData).where(eq(users.id, userId));
    return { status: "success", message: "Whitelist user updated" };
  } catch (e) {
    console.error("error updating whitelisted user", e);
    return { status: "error", message: "Error updating whitelisted user" };
  }
}

// -----------------------------
// Admin helpers
// -----------------------------
export type AddUsersToAdminResp = { status: "success" | "error"; message: string };
export async function addUsersToAdmin(walletAddresses: string[]): Promise<AddUsersToAdminResp> {
  try {
    if (walletAddresses.length) {
      const now = new Date().toISOString();
      await db.update(users).set({ isAdmin: true, updatedAt: now }).where(inArray(users.wallet, walletAddresses));
      await db.update(users).set({ isAdmin: true, updatedAt: now }).where(inArray(users.username, walletAddresses));
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
    console.error("error removing admin", e);
  }
}

// -----------------------------
// Artist helpers
// -----------------------------
export type AddUsersToArtistResp = { status: "success" | "error"; message: string };
export async function addUsersToArtist(walletAddresses: string[]): Promise<AddUsersToArtistResp> {
  try {
    if (walletAddresses.length) {
      const now = new Date().toISOString();
      await db.update(users).set({ isArtist: true, updatedAt: now }).where(inArray(users.wallet, walletAddresses));
      await db.update(users).set({ isArtist: true, updatedAt: now }).where(inArray(users.username, walletAddresses));
    }
    return { status: "success", message: "Users granted artist role" };
  } catch (e) {
    console.error("error adding users to artist", e);
    return { status: "error", message: "Error adding users to artist" };
  }
}

export async function removeFromArtist(userIds: string[]) {
  try {
    const now = new Date().toISOString();
    await db.update(users).set({ isArtist: false, updatedAt: now }).where(inArray(users.id, userIds));
  } catch (e) {
    console.error("error removing artist", e);
  }
}

// -----------------------------
// General helpers
// -----------------------------
export async function getAllUsers() {
  const walletlessEnabled = process.env.NEXT_PUBLIC_DISABLE_WALLET_REQUIREMENT === "true" && process.env.NODE_ENV !== "production";
  const session = await getServerAuthSession();
  if (!session && !walletlessEnabled) throw new Error("Unauthorized");
  try {
    return (await db.query.users.findMany()) ?? [];
  } catch (e) {
    console.error("error getting all users", e);
    throw new Error("Error getting all users");
  }
}

// -----------------------------
// Toggle helpers (whitelist, admin, artist)
// -----------------------------
export type ToggleResp = { status: "success" | "error"; added: string[]; removed: string[]; message: string };

export async function toggleUsersWhitelist(identifiers: string[]): Promise<ToggleResp> {
  return internalToggleHelper(identifiers, "isWhiteListed", "Whitelist updated");
}

export async function toggleUsersAdmin(identifiers: string[]): Promise<ToggleResp> {
  return internalToggleHelper(identifiers, "isAdmin", "Admin roles updated");
}

export async function toggleUsersArtist(identifiers: string[]): Promise<ToggleResp> {
  return internalToggleHelper(identifiers, "isArtist", "Artist roles updated");
}

// Shared toggle logic
async function internalToggleHelper(identifiers: string[], column: "isWhiteListed" | "isAdmin" | "isArtist", successMsg: string): Promise<ToggleResp> {
  try {
    if (identifiers.length === 0) return { status: "success", added: [], removed: [], message: "No users provided" };
    const now = new Date().toISOString();
    const usersByWallet = await db.query.users.findMany({ where: inArray(users.wallet, identifiers) });
    const usersByUsername = await db.query.users.findMany({ where: inArray(users.username, identifiers) });
    const allUsers = [...usersByWallet, ...usersByUsername];
    const idsToRemove = allUsers.filter(u => (u as any)[column]).map(u => u.id);
    const toAdd = identifiers.filter(id => {
      const existing = allUsers.find(u => u.wallet === id || u.username === id);
      return !existing || !(existing as any)[column];
    });
    if (idsToRemove.length) await db.update(users).set({ [column]: false, updatedAt: now } as any).where(inArray(users.id, idsToRemove));
    if (toAdd.length) {
      await db.update(users).set({ [column]: true, updatedAt: now } as any).where(inArray(users.wallet, toAdd));
      await db.update(users).set({ [column]: true, updatedAt: now } as any).where(inArray(users.username, toAdd));
    }
    return { status: "success", added: toAdd, removed: idsToRemove, message: successMsg };
  } catch (e) {
    console.error("error toggling", column, e);
    return { status: "error", added: [], removed: [], message: `Error toggling ${column}` };
  }
}
