export interface BookmarkItem {
    artistId: string;
    artistName: string;
    imageUrl: string | null;
}

/** Import identifiers only. Names and images are resolved by the server. */
export function legacyBookmarkIds(raw: string): string[] {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) throw new Error('Invalid saved bookmarks');
    const ids = value.map(item => {
        if (!item || typeof item !== 'object' || typeof item.artistId !== 'string'
            || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.artistId)) {
            throw new Error('Invalid saved bookmark');
        }
        return item.artistId.toLowerCase();
    });
    return [...new Set(ids)];
}

/** Call only after the server confirms these accounts were merged. Keep the old
 * copy unless the combined import source has been safely written for the survivor. */
export function preserveBookmarksAfterMerge(fromUserId: string, toUserId: string) {
    if (fromUserId === toUserId) return;
    const sourceKey = `bookmarks_${fromUserId}`;
    const raw = localStorage.getItem(sourceKey);
    if (!raw) return;
    const targetKey = `bookmarks_${toUserId}`;
    const target = localStorage.getItem(targetKey);
    const ids = [...new Set([...(target ? legacyBookmarkIds(target) : []), ...legacyBookmarkIds(raw)])];
    localStorage.setItem(targetKey, JSON.stringify(ids.map(artistId => ({ artistId }))));
    if (localStorage.getItem(sourceKey) === raw) localStorage.removeItem(sourceKey);
}
