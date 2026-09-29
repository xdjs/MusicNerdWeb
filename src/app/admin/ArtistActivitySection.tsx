import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { getArtistActivity } from '@/server/utils/activity/getArtistActivity';
import { activityLabels, triggerLabels } from '@/lib/activity/activityLabels';
import styles from '@/components/community/Community.module.css';
import surface from '@/app/profile/ProfileConcept.module.css';

export default function ArtistActivitySection({ data }: { data: Awaited<ReturnType<typeof getArtistActivity>> }) {
  const pageHref = (page: number) => `/admin?section=activity&activityPage=${page}&activityQuery=${encodeURIComponent(data.query)}&activityAction=${encodeURIComponent(data.action)}&activityId=${data.eventId}`;
  return <div className="min-w-0 space-y-5">
    <p className="text-sm text-muted-foreground">Research requests identify who started the work. Older activity may have no recorded initiator.</p>
    <form key={`${data.query}:${data.action}:${data.eventId}`} action="/admin" method="get" className={styles.filterBar}>
      <input type="hidden" name="section" value="activity" />
      <input type="search" name="activityQuery" aria-label="Search artist activity" placeholder="Search artist or contributor" defaultValue={data.query} maxLength={100} />
      <label className="flex min-w-0 flex-col gap-1 text-sm">Action
        <select name="activityAction" defaultValue={data.action}><option value="">All actions</option>{Object.entries(activityLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select>
      </label>
      <Button type="submit" variant="outline" className="min-h-11 rounded-xl">Search</Button>
      {(data.query || data.action || data.eventId) && <Link href="/admin?section=activity" className="text-sm underline">Show all activity</Link>}
    </form>
    <p className={styles.filterSummary}>{data.total.toLocaleString()} matching activities</p>
    <div className={styles.loreList}>{data.items.map(item => <article key={item.id} id={item.id} className={`${surface.surface} ${styles.loreCard}`}>
      <Link href={`/artist/${item.artistId}`} className="font-semibold underline underline-offset-4">{item.artistName ?? 'Unknown artist'}</Link>
      <p className="font-medium">{activityLabels[item.action] ?? item.action}</p>
      <p className="break-words text-sm">{item.actorName || item.actorEmail || item.actorId || (item.actorKind === 'user' ? 'Deleted account' : item.actorKind === 'system' ? 'Music Nerd system' : 'Unknown initiator')}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground"><span>{triggerLabels[item.trigger] ?? item.trigger}</span><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('en-US', { timeZone: 'UTC' }) + ' UTC'}</time></div>
      {item.actorId && <Link href={`/admin?section=activity&activityQuery=${item.actorId}`} className="text-sm underline">More activity by this account</Link>}
    </article>)}</div>
    {!data.items.length && <p className="rounded-2xl border p-6 text-sm text-muted-foreground">No recorded activity matches these filters.</p>}
    {data.total > data.pageSize && <nav aria-label="Artist activity pages" className="flex items-center justify-between gap-4 text-sm">
      {data.page > 1 ? <Link className={styles.pill} href={pageHref(data.page - 1)}>Previous</Link> : <span />}
      <span>Page {data.page} of {Math.ceil(data.total / data.pageSize)}</span>
      {data.page * data.pageSize < data.total ? <Link className={styles.pill} href={pageHref(data.page + 1)}>Next</Link> : <span />}
    </nav>}
  </div>;
}
