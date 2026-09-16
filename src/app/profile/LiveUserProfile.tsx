"use client";

import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useBookmarks } from '@/hooks/useBookmarks';
import type { User } from '@/server/db/DbTypes';
import type { ProfileSummary, ProfileUpdate } from '@/lib/profile/types';
import ProfileConcept from './ProfileConcept';
import ProfileLoading from './ProfileLoading';
import { readProfileJson as readJson } from '@/lib/profile/readProfileJson';
import { Button } from '@/components/ui/button';

type Account = Pick<User, 'id' | 'username' | 'email' | 'wallet' | 'isAdmin' | 'isWhiteListed' | 'isHidden'>;
type FeedPage = { items: ProfileUpdate[]; next: number | null; checked: number; unavailable: boolean };

export default function LiveUserProfile({ user }: { user: Account }) {
  const queryClient = useQueryClient();
  const { update, data: session, status } = useSession();
  const accountReady = status === 'authenticated' && session.user.id === user.id;
  const saved = useBookmarks(user.id);
  const [updateFilter, setUpdateFilter] = useState('All');
  const summary = useQuery({queryKey: ['profile-summary', user.id], queryFn: ({signal}) => readJson<ProfileSummary>('/api/profile/summary', user.id, signal), refetchOnWindowFocus: true, enabled: accountReady});
  const photo = useQuery({queryKey: ['profile-photo', user.id], queryFn: ({signal}) => readJson<{url: string | null}>('/api/user/profile-image', user.id, signal), staleTime: 45 * 60 * 1000, refetchInterval: 45 * 60 * 1000, refetchOnWindowFocus: true, retry: false, enabled: accountReady});
  const bookmarkIds = saved.bookmarks.map(artist => artist.artistId).join(',');
  const feed = useInfiniteQuery({queryKey: ['profile-updates', user.id, bookmarkIds, updateFilter], initialPageParam: 0,
    queryFn: ({signal, pageParam}) => readJson<FeedPage>(`/api/profile/updates?offset=${pageParam}&kind=${encodeURIComponent(updateFilter)}`, user.id, signal),
    getNextPageParam: page => page.next ?? undefined, enabled: accountReady && !saved.isLoading && saved.bookmarks.length > 0, retry: false, staleTime: 60_000,
  });
  useEffect(() => {
    if (!accountReady || summary.data?.totalContributions === undefined) return;
    try {
      localStorage.setItem(`ugcCount_${user.id}`, String(summary.data.totalContributions));
      window.dispatchEvent(new Event('ugcCountUpdated'));
    } catch { /* Browser storage is optional; account data remains available. */ }
  }, [accountReady, user.id, summary.data?.totalContributions]);
  if (!accountReady || summary.isPending) return <ProfileLoading />;
  if (summary.error || !summary.data) return <div className="mx-auto max-w-lg px-5 py-12" role="alert"><p>We couldn’t load your profile.</p><Button className="mt-4" onClick={() => void summary.refetch()}>Try again</Button></div>;
  return <>
    {photo.error && <p role="status" className="mx-auto w-full max-w-6xl px-5 pt-3 text-sm text-muted-foreground">Your photo couldn’t load. <button className="underline" onClick={() => void photo.refetch()}>Retry photo</button></p>}
    <ProfileConcept user={user} live={{...summary.data,
      name: user.username || 'Your profile', photo: photo.data?.url ?? null,
      bookmarks: saved.bookmarks, bookmarkBusy: !saved.canMutate,
      bookmarkError: saved.error || saved.importWarning || null, retryBookmarks: () => void saved.reload(),
      addBookmark: async id => { await saved.add(id); }, removeBookmark: async id => { await saved.remove(id); },
      setUpdateFilter,
      updates: feed.data?.pages.flatMap(page => page.items) ?? [], updatesLoading: feed.isFetching,
      updatesError: feed.error ? 'Some updates couldn’t load. Try again.' : null,
      updatesUnavailable: feed.data?.pages.some(page => page.unavailable) ?? false,
      checkedArtists: feed.data?.pages.at(-1)?.checked ?? 0, hasMoreUpdates: !!feed.hasNextPage,
      loadMoreUpdates: () => { if (feed.error) void feed.refetch(); else void feed.fetchNextPage(); },
      saveProfile: async (name, file) => {
        const response = await fetch(`/api/user/${user.id}`, {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username: name})});
        if (!response.ok) { const data = await response.json(); throw new Error(data.message || 'Could not save your name.'); }
        if (file) {
          const body = new FormData(); body.append('file', file);
          const upload = await fetch('/api/user/profile-image', {method: 'POST', headers: {'X-Profile-Account': user.id}, body});
          if (!upload.ok) throw new Error('Your name was saved, but your photo could not be saved. Please retry.');
        }
        const next = file ? await readJson<{url: string | null}>('/api/user/profile-image', user.id) : {url: photo.data?.url ?? null};
        queryClient.setQueryData(['profile-photo', user.id], next);
        await update();
        return {name, photo: next.url};
      },
    }} />
  </>;
}
