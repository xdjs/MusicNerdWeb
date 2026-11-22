import { formatShortDate } from './formatShortDate';

/**
 * When a connected agent last used Music Nerd, in words: "Last used 5 min ago",
 * "yesterday", or a short date once it is older.
 *
 * @param lastUsedAt - The ISO timestamp, or null when it has not been used.
 * @param now - The current time.
 * @returns The label.
 */
export function lastUsedLabel(lastUsedAt: string | null, now: Date = new Date()): string {
  if (!lastUsedAt) return 'Not used yet';
  const used = new Date(lastUsedAt);
  const minutes = Math.floor((now.getTime() - used.getTime()) / 60_000);
  if (minutes < 1) return 'Last used just now';
  if (minutes < 60) return `Last used ${minutes} min ago`;
  if (used.toDateString() === now.toDateString()) {
    const hours = Math.floor(minutes / 60);
    return `Last used ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (used.toDateString() === yesterday.toDateString()) return 'Last used yesterday';
  return `Last used ${formatShortDate(lastUsedAt, now)}`;
}
