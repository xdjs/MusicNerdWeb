/** Persists through the refresh that replaces the build with the finished page. */
export function tourPendingKey(artistId: string): string {
    return `mn-tour-pending-${artistId}`;
}
