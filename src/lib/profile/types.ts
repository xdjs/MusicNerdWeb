import type { UserEntry } from '@/app/profile/UserEntriesTable';
import type { BookmarkItem } from '@/lib/bookmarks';
import type { ArtistLatestItem } from '@/lib/artist/artistLatest';

export type ProfileSummary = { totalContributions: number; approved: number; selfEdits: number; artistsAdded: number; pending: number; entries: UserEntry[]; suggestions: BookmarkItem[] };
export type ProfileUpdate = ArtistLatestItem & { artistId: string; artistName: string };
export type LiveProfileModel = ProfileSummary & {
  name: string;
  photo: string | null;
  bookmarks: BookmarkItem[];
  bookmarkBusy: boolean;
  bookmarkError: string | null;
  setUpdateFilter: (value: string) => void;
  updates: ProfileUpdate[];
  updatesLoading: boolean;
  updatesError: string | null;
  updatesUnavailable: boolean;
  checkedArtists: number;
  hasMoreUpdates: boolean;
  loadMoreUpdates: () => void;
  retryBookmarks: () => void;
  addBookmark: (artistId: string) => Promise<void>;
  removeBookmark: (artistId: string) => Promise<void>;
  saveProfile: (name: string, photo: File | null) => Promise<{ name: string; photo: string | null }>;
};
