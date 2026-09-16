'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { legacyBookmarkIds, type BookmarkItem } from '@/lib/bookmarks';

type BookmarkResponse = { userId: string; bookmarks: BookmarkItem[] };
type BookmarkData = BookmarkResponse & { importWarning?: string };
const bookmarkKey = (userId: string) => ['bookmarks', userId] as const;

async function requestBookmarks(userId: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<BookmarkResponse> {
    const response = await fetch('/api/bookmarks', {
        method, credentials: 'same-origin', cache: 'no-store', signal,
        headers: { 'Content-Type': 'application/json', 'X-Bookmark-Account': userId },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
        if (response.status === 401 || response.status === 409) throw new Error('Your account changed. Please sign in again or reload.');
        throw new Error('Bookmarks couldn’t sync. Please try again.');
    }
    const data: BookmarkResponse = await response.json();
    if (data.userId !== userId || !Array.isArray(data.bookmarks)) throw new Error('Your account changed. Please reload.');
    return data;
}

/** Account data is authoritative. Local storage is only a one-time migration source. */
export async function loadAccountBookmarks(userId: string, signal?: AbortSignal): Promise<BookmarkData> {
    let data = await requestBookmarks(userId, 'GET', undefined, signal);
    const key = `bookmarks_${userId}`;
    let raw: string | null;
    try { raw = localStorage.getItem(key); } catch { return data; }
    if (!raw) return data;

    try {
        const ids = legacyBookmarkIds(raw);
        // Reverse the batches because each import prepends missing entries.
        for (let end = ids.length; end > 0; end = Math.max(0, end - 500)) {
            data = await requestBookmarks(userId, 'POST', { artistIds: ids.slice(Math.max(0, end - 500), end), import: true }, signal);
        }
        // Only remove the exact snapshot successfully imported; preserve any intervening local edit.
        if (localStorage.getItem(key) === raw) localStorage.removeItem(key);
        return data;
    } catch (error) {
        if (signal?.aborted) throw error;
        return { ...data, importWarning: 'Your old browser bookmarks could not finish importing. They are still saved in this browser; retry to sync them.' };
    }
}

export function useBookmarks(userId: string) {
    const { data: session, status } = useSession();
    const authorized = !!userId && status === 'authenticated' && session?.user?.id === userId;
    const client = useQueryClient();
    const query = useQuery({
        queryKey: bookmarkKey(userId),
        queryFn: ({ signal }) => loadAccountBookmarks(userId, signal),
        enabled: authorized,
        staleTime: 0,
        refetchOnWindowFocus: 'always',
        refetchInterval: 30_000,
        retry: false,
    });
    const mutation = useMutation({
        scope: { id: `bookmarks:${userId}` },
        mutationFn: async ({ method, body }: { method: string; body: unknown }) => {
            if (!authorized) throw new Error('Sign in to save bookmarks to your account.');
            return requestBookmarks(userId, method, body);
        },
        onMutate: () => client.cancelQueries({ queryKey: bookmarkKey(userId) }),
        onSuccess: async data => {
            // Cancel any focus refresh that started while the mutation was in flight.
            await client.cancelQueries({ queryKey: bookmarkKey(data.userId) });
            client.setQueryData(bookmarkKey(data.userId), data);
        },
        retry: false,
    });
    return {
        bookmarks: authorized ? query.data?.bookmarks ?? [] : [],
        authorized,
        canMutate: authorized && !query.isFetching && !query.isPending && !query.error && !mutation.isPending,
        isLoading: authorized && query.isPending,
        isSaving: mutation.isPending,
        error: authorized ? mutation.error?.message ?? query.error?.message ?? null : null,
        importWarning: authorized ? query.data?.importWarning : undefined,
        reload: () => { mutation.reset(); return query.refetch(); },
        add: (artistId: string) => mutation.mutateAsync({ method: 'POST', body: { artistIds: [artistId] } }),
        remove: (artistId: string) => mutation.mutateAsync({ method: 'DELETE', body: { artistId } }),
        saveEdits: (orderedArtistIds: string[], removedArtistIds: string[]) => mutation.mutateAsync({ method: 'PATCH', body: { orderedArtistIds, removedArtistIds } }),
    };
}
