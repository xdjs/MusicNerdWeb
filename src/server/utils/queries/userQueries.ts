/* no changes above, appending artist toggle */
// --------------------------
// Toggle artist helpers
// --------------------------
export type ToggleArtistResp = {
    status: "success" | "error";
    added: string[]; // wallets/usernames added as artist
    removed: string[]; // userIds removed from artist
    message: string;
};

export async function toggleUsersArtist(identifiers: string[]): Promise<ToggleArtistResp> {
    try {
        if (identifiers.length === 0) {
            return { status: "success", added: [], removed: [], message: "No users provided" };
        }
        const now = new Date().toISOString();

        const usersByWallet = await db.query.users.findMany({ where: inArray(users.wallet, identifiers) });
        const usersByUsername = await db.query.users.findMany({ where: inArray(users.username, identifiers) });
        const allUsers = [...usersByWallet, ...usersByUsername];

        const idsToRemove = allUsers.filter((u) => u.isArtist).map((u) => u.id);
        const walletsToAdd = identifiers.filter((id) => {
            const existing = allUsers.find((u) => u.wallet === id || u.username === id);
            return !existing || !existing.isArtist;
        });

        if (idsToRemove.length) {
            await db.update(users).set({ isArtist: false, updatedAt: now }).where(inArray(users.id, idsToRemove));
        }
        if (walletsToAdd.length) {
            await db.update(users).set({ isArtist: true, updatedAt: now }).where(inArray(users.wallet, walletsToAdd));
            await db.update(users).set({ isArtist: true, updatedAt: now }).where(inArray(users.username, walletsToAdd));
        }

        return { status: "success", added: walletsToAdd, removed: idsToRemove, message: "Artist roles updated" };
    } catch (e) {
        console.error("error toggling artist roles", e);
        return { status: "error", added: [], removed: [], message: "Error toggling artist roles" };
    }
}
