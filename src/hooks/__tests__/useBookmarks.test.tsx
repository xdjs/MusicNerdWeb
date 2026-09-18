import React from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { loadAccountBookmarks, useBookmarks } from '../useBookmarks';
import BookmarkButton from '@/app/_components/BookmarkButton';
import { preserveBookmarksAfterMerge, type BookmarkItem } from '@/lib/bookmarks';

const USER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const artist = (artistId: string): BookmarkItem => ({ artistId, artistName: artistId === A ? 'Artist A' : 'Artist B', imageUrl: null });
const response = (bookmarks: BookmarkItem[], userId = USER) => ({ ok: true, status: 200, json: async () => ({ userId, bookmarks }) });
const clients: QueryClient[] = [];

function wrapper() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    clients.push(client);
    return function BookmarkTestProvider({ children }: { children: React.ReactNode }) { return <QueryClientProvider client={client}>{children}</QueryClientProvider>; };
}
function session(userId: string | null) {
    (useSession as jest.Mock).mockReturnValue({ status: userId ? 'authenticated' : 'unauthenticated', data: userId ? { user: { id: userId } } : null });
}

beforeEach(() => { localStorage.clear(); session(USER); global.fetch = jest.fn(); });
afterEach(() => { clients.splice(0).forEach(client => client.clear()); });

it('imports only IDs after confirming the account, then removes the imported local snapshot', async () => {
    const raw = JSON.stringify([{ ...artist(A), artistName: 'Untrusted old name', imageUrl: 'https://old.test/photo' }]);
    localStorage.setItem(`bookmarks_${USER}`, raw);
    (fetch as jest.Mock).mockResolvedValueOnce(response([artist(B)])).mockResolvedValueOnce(response([artist(A), artist(B)]));
    expect((await loadAccountBookmarks(USER)).bookmarks).toEqual([artist(A), artist(B)]);
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/bookmarks', expect.objectContaining({
        method: 'POST', body: JSON.stringify({ artistIds: [A], import: true }), headers: expect.objectContaining({ 'X-Bookmark-Account': USER }),
    }));
    expect(localStorage.getItem(`bookmarks_${USER}`)).toBeNull();
});

it('keeps old saves and server data when an import fails', async () => {
    const raw = JSON.stringify([artist(A)]);
    localStorage.setItem(`bookmarks_${USER}`, raw);
    (fetch as jest.Mock).mockResolvedValueOnce(response([artist(B)])).mockResolvedValueOnce({ ok: false, status: 503 });
    expect(await loadAccountBookmarks(USER)).toMatchObject({ bookmarks: [artist(B)], importWarning: expect.any(String) });
    expect(localStorage.getItem(`bookmarks_${USER}`)).toBe(raw);
});

it('never imports another account’s local data after a session mismatch', async () => {
    localStorage.setItem(`bookmarks_${USER}`, JSON.stringify([artist(A)]));
    (fetch as jest.Mock).mockResolvedValue(response([], OTHER));
    await expect(loadAccountBookmarks(USER)).rejects.toThrow('account changed');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(`bookmarks_${USER}`)).not.toBeNull();
});

it('retains malformed legacy data rather than silently dropping it', async () => {
    localStorage.setItem(`bookmarks_${USER}`, '{broken');
    (fetch as jest.Mock).mockResolvedValue(response([]));
    expect(await loadAccountBookmarks(USER)).toHaveProperty('importWarning');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(`bookmarks_${USER}`)).toBe('{broken');
});

it('preserves pending imports when a confirmed merge changes the account ID', () => {
    localStorage.setItem(`bookmarks_${USER}`, JSON.stringify([artist(A), artist(B)]));
    localStorage.setItem(`bookmarks_${OTHER}`, JSON.stringify([artist(B)]));
    preserveBookmarksAfterMerge(USER, OTHER);
    expect(JSON.parse(localStorage.getItem(`bookmarks_${OTHER}`)!)).toEqual([{ artistId: B }, { artistId: A }]);
    expect(localStorage.getItem(`bookmarks_${USER}`)).toBeNull();
});

it('does not erase pending imports when merged browser storage cannot be written', () => {
    const raw = JSON.stringify([artist(A)]);
    localStorage.setItem(`bookmarks_${USER}`, raw);
    const write = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Full storage'); });
    try {
        expect(() => preserveBookmarksAfterMerge(USER, OTHER)).toThrow('Full storage');
        expect(localStorage.getItem(`bookmarks_${USER}`)).toBe(raw);
    } finally { write.mockRestore(); }
});

it('does not expose cached bookmarks after logout or an account switch', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce(response([artist(A)])).mockResolvedValueOnce(response([artist(B)], OTHER));
    const view = renderHook(({ userId }) => useBookmarks(userId), { initialProps: { userId: USER }, wrapper: wrapper() });
    await waitFor(() => expect(view.result.current.bookmarks).toEqual([artist(A)]));
    session(null);
    view.rerender({ userId: USER });
    expect(view.result.current.bookmarks).toEqual([]);
    expect(view.result.current.authorized).toBe(false);
    session(OTHER);
    view.rerender({ userId: OTHER });
    expect(view.result.current.bookmarks).toEqual([]);
    await waitFor(() => expect(view.result.current.bookmarks).toEqual([artist(B)]));
});

it('a second independent client sees the account save without any local storage', async () => {
    let rows: BookmarkItem[] = [];
    (fetch as jest.Mock).mockImplementation(async (_url, init) => {
        if (init.method === 'POST') rows = [artist(A)];
        return response([...rows]);
    });
    const first = renderHook(() => useBookmarks(USER), { wrapper: wrapper() });
    const second = renderHook(() => useBookmarks(USER), { wrapper: wrapper() });
    await waitFor(() => expect(first.result.current.isLoading || second.result.current.isLoading).toBe(false));
    await act(async () => { await first.result.current.add(A); });
    await act(async () => { await second.result.current.reload(); });
    await waitFor(() => expect(second.result.current.bookmarks).toEqual([artist(A)]));
    expect(localStorage.length).toBe(0);
});

it('the real button reports a failed write without claiming it was bookmarked', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce(response([])).mockResolvedValueOnce({ ok: false, status: 503 });
    render(<BookmarkButton userId={USER} artistId={A} artistName="Artist A" />, { wrapper: wrapper() });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Bookmark' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Bookmark' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('couldn’t sync'));
    expect(screen.getByRole('button', { name: 'Bookmark' })).toHaveAttribute('aria-pressed', 'false');
});

it('persists removing the final bookmark and updates the cached collection', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce(response([artist(A)])).mockResolvedValueOnce(response([]));
    const hook = renderHook(() => useBookmarks(USER), {wrapper: wrapper()});
    await waitFor(() => expect(hook.result.current.bookmarks).toEqual([artist(A)]));
    await act(async () => { await hook.result.current.remove(A); });
    await waitFor(() => expect(hook.result.current.bookmarks).toEqual([]));
    expect(fetch).toHaveBeenLastCalledWith('/api/bookmarks', expect.objectContaining({method: 'DELETE', body: JSON.stringify({artistId: A})}));
});
