'use client';
import MusicNerdSelect from '@/components/ui/MusicNerdSelect';
import { useRef, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import type { ContributionsPage } from '@/lib/admin/adminReadTypes';
import styles from './Contributions.module.css';

type FilterData = Pick<ContributionsPage, 'userId'|'query'|'type'|'origin'|'status'|'counts'>;

export default function ContributionFilters({ data }: { data: FilterData }) {
 const router = useRouter();
 const formRef = useRef<HTMLFormElement>(null);
 const [pending, startTransition] = useTransition();
 const defaultStatus = data.userId ? 'all' : 'pending';
 const filtered = Boolean(data.query || data.origin || data.type || data.status !== defaultStatus);
 const reset = new URLSearchParams(data.userId ? {userId:data.userId,status:defaultStatus} : {status:defaultStatus});
 function apply(form: HTMLFormElement, changed?: {name:string;value:string}) {
  const fields = new FormData(form);
  if (changed) fields.set(changed.name, changed.value);
  const params = new URLSearchParams();
  for (const name of ['userId','query','type','origin','status']) {
   const value = String(fields.get(name) || '').trim();
   if (value) params.set(name, value);
  }
  params.set('page','1');
  startTransition(() => router.push(`/admin/contributions?${params}`, {scroll:false}));
 }
 return <form ref={formRef} action="/admin/contributions" method="get" role="search" aria-label="Contribution filters" aria-busy={pending} className={styles.filters}
  onSubmit={event=>{event.preventDefault();apply(event.currentTarget);}}
>
  {data.userId && <input type="hidden" name="userId" value={data.userId}/>}
  <fieldset disabled={pending} className={styles.filterFields}>
   <legend className="sr-only">Filter contributions</legend>
   <div className={styles.search}>
    <input type="search" name="query" aria-label="Search contributions" placeholder={data.userId ? 'Search artist or URL' : 'Search artist, contributor or URL'} defaultValue={data.query} maxLength={100}/>
    <button type="submit" aria-label="Search contributions"><Search size={18} aria-hidden="true"/></button>
   </div>
   <label className={styles.typeFilter}>Type<MusicNerdSelect label="Type" name="type" defaultValue={data.type} disabled={pending} onValueChange={value=>{if(formRef.current) apply(formRef.current,{name:'type',value});}} options={[{value:'',label:'All types'},{value:'link',label:'Link submissions'},{value:'lore',label:'Lore sources'},{value:'upload',label:'Uploads'}]} /></label>
   <label className={styles.statusFilter}>Status<MusicNerdSelect label="Status" name="status" defaultValue={data.status} disabled={pending} onValueChange={value=>{if(formRef.current) apply(formRef.current,{name:'status',value});}} options={[{value:'pending',label:'Awaiting review'},{value:'approved',label:'Approved'},{value:'rejected',label:'Rejected'},{value:'all',label:'All statuses'}]} /></label>
   <label className={styles.originFilter}>Origin<MusicNerdSelect label="Origin" name="origin" defaultValue={data.origin} disabled={pending} aria-describedby={data.origin==='unknown'?'origin-help':undefined} onValueChange={value=>{if(formRef.current) apply(formRef.current,{name:'origin',value});}} options={[
    {value:'',label:'All origins'},
    {value:'user',label:`User submissions (${data.counts.user.total.toLocaleString()} total)`},
    {value:'research',label:`Automated research (${data.counts.research.total.toLocaleString()} total)`},
    {value:'unknown',label:`Unknown origin (${data.counts.unknown.total.toLocaleString()} total)`},
   ]} /></label>
  </fieldset>
  {(filtered || pending) && <div className={styles.filterFoot}>
   {data.origin==='unknown' && <p id="origin-help" className={styles.hint}>How these entries were added wasn’t recorded.</p>}
   {pending ? <span role="status">Updating…</span> : filtered && <Link href={`/admin/contributions?${reset}`} scroll={false}>Clear filters</Link>}
  </div>}
 </form>;
}
