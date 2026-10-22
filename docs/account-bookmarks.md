# Account bookmarks (removed)

Bookmarks were removed from the site. Pete decided on September 21, 2026, and reconfirmed with Carl, that the profile shows
artists from contributions instead ([#1325](https://github.com/xdjs/MusicNerdWeb/issues/1325)), and
[#1595](https://github.com/xdjs/MusicNerdWeb/issues/1595) does not migrate bookmarks to MusicNerdAPI.
The button, hook, profile section and `/api/bookmarks` are deleted.

## What is kept

- **Stored data.** The `user_artist_bookmarks` table, its schema entry and migration
  `drizzle/0028_famous_captain_britain.sql` stay. Nothing reads or writes the rows from the site.
- **Account merges.** `mergeAccounts` still locks both accounts and moves the placeholder's rows to the
  surviving account (`lockBookmarkUsers`, `transferUserBookmarks` in `src/server/utils/queries/bookmarkQueries.ts`),
  because the table cascades on user delete and the rows would otherwise be lost.
- **Browser copies.** Old `localStorage[bookmarks_<userId>]` values stay in each browser; the site no longer
  reads, imports or moves them.
