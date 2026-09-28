'use client';
import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { approveUgcAdminAction } from '@/app/actions/serverActions';
import { updateSourceStatus } from '@/app/actions/dashboardActions';
import type { Contribution, getAdminContributions } from '@/server/utils/contributions/getAdminContributions';
import { triggerLabels } from '@/lib/activity/activityLabels';
import styles from '@/components/community/Community.module.css';
import surface from '@/app/profile/ProfileConcept.module.css';
const origins = { user: 'User submissions', research: 'Automated research', unknown: 'Unknown origin' };
const types = { link: 'Link submission', lore: 'Lore source', upload: 'Upload' };

export default function ContributionReview({ data, onApproveLinks = approveUgcAdminAction, onReviewLore = updateSourceStatus }: {
 data: Awaited<ReturnType<typeof getAdminContributions>>;
 onApproveLinks?: typeof approveUgcAdminAction; onReviewLore?: typeof updateSourceStatus;
}) {
 const router = useRouter();
 const [refreshing, startRefresh] = useTransition();
 const [busy, setBusy] = useState(false);
 const inFlight = useRef(false);
 const [feedback, setFeedback] = useState<{error:boolean;message:string}|null>(null);
 const href = (changes: Record<string,string>) => {
  const params = new URLSearchParams({userId:data.userId,query:data.query,type:data.type,origin:data.origin,status:data.status,...changes});
  return `/admin/contributions?${params}`;
 };
 async function review(item: Contribution, status: 'approved'|'rejected') {
  if(inFlight.current || refreshing) return;
  inFlight.current = true; setBusy(true); setFeedback(null);
  try {
   const response = item.type === 'link' ? await onApproveLinks([item.id]) : await onReviewLore(item.id,status,'pending');
   const success = 'success' in response ? response.success : response.status === 'success';
   const error = 'error' in response ? response.error : 'message' in response ? response.message : undefined;
   setFeedback({error:!success,message:success ? `Submission ${status}.` : error || 'Could not review this submission.'});
   startRefresh(() => router.refresh());
  } catch { setFeedback({error:true,message:'Review could not be confirmed. Refresh before retrying.'}); }
  finally { inFlight.current = false; setBusy(false); }
 }
 return <div className="min-w-0 space-y-5">
  <div className="grid min-w-0 grid-cols-3 gap-2 sm:gap-3" aria-label="Contribution counts">
   {Object.entries(origins).map(([origin,label]) => <Link key={origin} href={href({origin,status:'pending',page:'1'})} className={`${surface.surface} min-w-0 rounded-2xl p-3 sm:p-4`}>
    <span className="block text-xs font-semibold sm:text-base">{label}</span><span className="mt-2 block text-sm font-semibold">{data.counts[origin as keyof typeof origins].pending.toLocaleString()} pending</span><span className="block text-xs text-muted-foreground sm:text-sm">{data.counts[origin as keyof typeof origins].total.toLocaleString()} total</span>
   </Link>)}
  </div>
  <p className="text-xs text-muted-foreground sm:text-sm">Counts match your account, type and search filters. Unknown origin means the submission method wasn’t recorded.</p>
  <Link href={href({origin:'user',status:'pending',page:'1'})} className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium">Review pending user submissions</Link>
  <form action="/admin/contributions" method="get" className={styles.filterBar} key={`${data.userId}:${data.query}:${data.type}:${data.origin}:${data.status}`}>
   {data.userId && <input type="hidden" name="userId" value={data.userId}/>}
   <input type="search" name="query" aria-label="Search contributions" placeholder="Search artist, contributor or URL" defaultValue={data.query} maxLength={100}/>
   <label>Origin<select name="origin" defaultValue={data.origin}><option value="">All origins</option>{Object.entries(origins).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
   <label>Type<select name="type" defaultValue={data.type}><option value="">All types</option>{Object.entries(types).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
   <label>Status<select name="status" defaultValue={data.status}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All statuses</option></select></label>
   <Button type="submit" variant="outline" className="min-h-11 rounded-xl">Apply filters</Button>
   <Link href={href({query:'',origin:'',type:'',status:data.userId?'all':'pending',page:'1'})} className="inline-flex min-h-11 items-center text-sm underline">Clear filters</Link>
  </form>
  <p className={styles.filterSummary}>{data.total.toLocaleString()} matching submissions{data.total > data.pageSize ? ` · Page ${data.page} of ${Math.ceil(data.total / data.pageSize)}` : ''}</p>
  {feedback && <p role={feedback.error?'alert':'status'} className="text-sm">{feedback.message}</p>}
  <div className={styles.loreList}>
   {data.items.map(item => {
    const title = item.title || types[item.type];
    const actor = item.username || item.email || item.userId || (item.actorKind === 'user'?'Deleted account':item.actorKind === 'system'?'Music Nerd system':'Unknown account');
    return <article key={`${item.type}:${item.id}`} id={`contribution-${item.id}`} className={`${surface.surface} ${styles.loreCard}`}>
     <div className={styles.loreCardTop}><div className="min-w-0"><Link href={`/artist/${item.artistId}`} className="font-semibold underline underline-offset-4">{item.artistName || 'Unknown artist'}</Link><p className="mt-1 break-words text-sm">{title}</p></div>
      {item.status === 'pending' && <div className={styles.loreActions}>
       <Button variant="outline" className={styles.approveButton} disabled={busy||refreshing} aria-label={`Approve ${title}`} onClick={()=>void review(item,'approved')}>Approve</Button>
       {item.type !== 'link' && <Button variant="outline" className={styles.loreReject} disabled={busy||refreshing} aria-label={`Reject ${title}`} onClick={()=>void review(item,'rejected')}>Reject</Button>}
      </div>}
     </div>
     {item.url && (/^https?:\/\//i.test(item.url) ? <a className={styles.loreUrl} href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a> : <p className={styles.loreUrl}>{item.url}</p>)}
     <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground"><span>{types[item.type]}</span><span>{origins[item.origin]}</span><span className="capitalize">{item.status}</span></div>
     <p className="break-words text-sm">{item.origin==='research'?'Research initiated by':item.origin==='user'?'Submitted by':'Recorded account:'} {actor}</p>
     <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
      {item.createdAt && <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('en-US',{timeZone:'UTC'})} UTC</time>}
      {item.trigger && <span>{triggerLabels[item.trigger] || item.trigger}</span>}
     </div>
     <div className="flex flex-wrap gap-4 text-sm">
      {item.userId && <Link className="underline" href={`/admin/contributions?userId=${item.userId}&status=all`}>View user contributions</Link>}
      {item.activityId && <Link className="underline" href={`/admin?section=activity&activityId=${item.activityId}`}>View initiating activity</Link>}
     </div>
    </article>;
   })}
  </div>
  {!data.items.length && <p className="rounded-2xl border p-6 text-sm text-muted-foreground">No submissions match these filters.</p>}
  {data.total > data.pageSize && <nav aria-label="Contribution pages" className="flex items-center justify-between gap-4 text-sm">
   {data.page>1?<Link className={styles.pill} href={href({page:String(data.page-1)})}>Previous</Link>:<span/>}
   <span>Page {data.page} of {Math.ceil(data.total/data.pageSize)}</span>
   {data.page*data.pageSize<data.total?<Link className={styles.pill} href={href({page:String(data.page+1)})}>Next</Link>:<span/>}
  </nav>}
 </div>;
}
