'use client';
import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import type { getAdminContributions } from '@/server/utils/contributions/getAdminContributions';
import styles from './Contributions.module.css';

type FilterData = Pick<Awaited<ReturnType<typeof getAdminContributions>>, 'userId'|'query'|'type'|'origin'|'status'|'counts'>;

export default function ContributionFilters({ data }: { data: FilterData }) {
 const router = useRouter();
 const [pending, startTransition] = useTransition();
 const defaultStatus = data.userId ? 'all' : 'pending';
 const filtered = Boolean(data.query || data.origin || data.type || data.status !== defaultStatus);
 const reset = new URLSearchParams(data.userId ? {userId:data.userId,status:defaultStatus} : {status:defaultStatus});
 function apply(form: HTMLFormElement) {
  const fields = new FormData(form);
  const params = new URLSearchParams();
  for (const name of ['userId','query','type','origin','status']) {
   const value = String(fields.get(name) || '').trim();
   if (value) params.set(name, value);
  }
  params.set('page','1');
  startTransition(() => router.push(`/admin/contributions?${params}`, {scroll:false}));
 }
 return <form action="/admin/contributions" method="get" role="search" aria-label="Contribution filters" aria-busy={pending} className={styles.filters}
  onSubmit={event=>{event.preventDefault();apply(event.currentTarget);}}
  onChange={event=>{if(event.target instanceof HTMLSelectElement) apply(event.currentTarget);}}>
  {data.userId && <input type="hidden" name="userId" value={data.userId}/>}
  <fieldset disabled={pending} className={styles.filterFields}>
   <legend className="sr-only">Filter contributions</legend>
   <div className={styles.search}>
    <input type="search" name="query" aria-label="Search contributions" placeholder={data.userId ? 'Search artist or URL' : 'Search artist, contributor or URL'} defaultValue={data.query} maxLength={100}/>
    <button type="submit" aria-label="Search contributions"><Search size={18} aria-hidden="true"/></button>
   </div>
   <label className={styles.typeFilter}>Type<select name="type" defaultValue={data.type}><option value="">All types</option><option value="link">Link submissions</option><option value="lore">Lore sources</option><option value="upload">Uploads</option></select></label>
   <label className={styles.statusFilter}>Status<select name="status" defaultValue={data.status}><option value="pending">Awaiting review</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All statuses</option></select></label>
   <label className={styles.originFilter}>Origin<select name="origin" defaultValue={data.origin} aria-describedby={data.origin==='unknown'?'origin-help':undefined}>
    <option value="">All origins</option>
    <option value="user">User submissions ({data.counts.user.total.toLocaleString()} total)</option>
    <option value="research">Automated research ({data.counts.research.total.toLocaleString()} total)</option>
    <option value="unknown">Unknown origin ({data.counts.unknown.total.toLocaleString()} total)</option>
   </select></label>
  </fieldset>
  {(filtered || pending) && <div className={styles.filterFoot}>
   {data.origin==='unknown' && <p id="origin-help" className={styles.hint}>How these entries were added wasn’t recorded.</p>}
   {pending ? <span role="status">Updating…</span> : filtered && <Link href={`/admin/contributions?${reset}`} scroll={false}>Clear filters</Link>}
  </div>}
 </form>;
}
