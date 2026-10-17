'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MusicNerdSelect from '@/components/ui/MusicNerdSelect';
import type { getAdminReviewQueue } from '@/server/utils/contributions/getAdminReviewQueue';
import type { ReviewItem } from '@/lib/contributions/adminReviewTypes';
import LoreReviewDetail from './LoreReviewDetail';

/** All contribution types share one ordered, searchable list and one details surface. */
export default function LoreReviewQueue({data}: {data:Awaited<ReturnType<typeof getAdminReviewQueue>>}) {
  const router=useRouter();
  const [pending,startTransition]=useTransition();
  const [selected,setSelected]=useState<ReviewItem|null>(null);
  const [reviewed,setReviewed]=useState<Set<string>>(()=>new Set());
  const searchRef=useRef<HTMLInputElement>(null);
  const key=(item:ReviewItem)=>`${item.type}:${item.id}`;
  const hidden=data.items.filter(item=>reviewed.has(key(item)));
  const items=data.items.filter(item=>!reviewed.has(key(item)));
  const labels={links:'Link',sources:'Lore source',corrections:'About correction'};
  const counts={...data.counts};
  hidden.forEach(item=>{counts[item.type]=Math.max(0,counts[item.type]-1);});
  const total=data.total-hidden.length;
  function navigate(type=data.type,page=1,query=searchRef.current?.value ?? data.query) {
    const params=new URLSearchParams({section:'lore',reviewType:type,reviewPage:String(page)});
    if(query.trim()) params.set('reviewQuery',query.trim());
    startTransition(()=>router.push(`/admin?${params}`,{scroll:false}));
  }
  return <div className="min-w-0 space-y-4" aria-busy={pending}>
    <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={event=>{event.preventDefault();navigate();}}>
      <div className="min-w-0 flex-1"><label htmlFor="review-search" className="mb-2 block text-xs text-muted-foreground">Search</label><div className="flex min-h-11 rounded-xl border border-border bg-background"><input id="review-search" ref={searchRef} type="search" name="reviewQuery" defaultValue={data.query} placeholder="Search artist, submission or contributor" maxLength={100} className="min-w-0 flex-1 rounded-xl bg-transparent px-3 text-sm"/><button type="submit" aria-label="Search reviews" disabled={pending} className="min-h-11 px-3"><Search size={18}/></button></div></div>
      <div className="sm:w-52"><label htmlFor="review-type" className="mb-2 block text-xs text-muted-foreground">Review type</label><MusicNerdSelect id="review-type" label="Review type" value={data.type} disabled={pending} onValueChange={type=>navigate(type as typeof data.type)} options={[
        {value:'all',label:`All (${counts.links+counts.sources+counts.corrections})`},{value:'links',label:`Links (${counts.links})`},{value:'sources',label:`Lore sources (${counts.sources})`},{value:'corrections',label:`About corrections (${counts.corrections})`},
      ]}/></div>
    </form>
    <div className="flex items-center justify-between text-xs text-muted-foreground"><p role="status">{pending?'Updating…':`${total.toLocaleString()} pending ${total===1?'item':'items'}`}</p><span>Newest first</span></div>
    <ul aria-label="Pending reviews" className="overflow-hidden rounded-2xl border border-border divide-y divide-border">
      {items.map(item=><li key={key(item)}><button type="button" disabled={pending} onClick={()=>setSelected(item)} className="group grid !rounded-none min-h-20 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-pastypink/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pastypink sm:grid-cols-[minmax(0,1fr)_8rem_5rem_auto]" aria-label={`Review ${labels[item.type]} for ${item.artistName || 'Unknown artist'}: ${item.title || 'Submission'}`}>
        <span className="min-w-0"><span className="block truncate font-medium">{item.artistName || 'Unknown artist'}</span><span className="mt-1 block truncate text-sm text-muted-foreground">{item.type==='corrections' ? item.details || item.title : item.title || item.url}</span><span className="mt-2 block text-xs text-muted-foreground sm:hidden">{labels[item.type]} · {item.createdAt?new Date(item.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'}):'—'}</span></span>
        <span className="hidden text-xs text-muted-foreground sm:block">{labels[item.type]}</span><time dateTime={item.createdAt ?? undefined} className="hidden text-xs text-muted-foreground sm:block">{item.createdAt?new Date(item.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'}):'—'}</time><ChevronRight size={16} className="text-muted-foreground"/>
      </button></li>)}
      {!items.length && <li className="p-8 text-center text-sm text-muted-foreground">{hidden.length?'This page is reviewed. Use the page controls to continue.':'No pending items match these filters.'}</li>}
    </ul>
    {(data.total>data.pageSize || data.page>1) && <nav aria-label="Review pages" className="flex items-center justify-between text-sm"><Button variant="outline" disabled={pending||data.page<=1} onClick={()=>navigate(data.type,data.page-1,data.query)}>Previous</Button><span>Page {data.page} of {Math.max(1,Math.ceil(data.total/data.pageSize))}</span><Button variant="outline" disabled={pending||data.page*data.pageSize>=data.total} onClick={()=>navigate(data.type,data.page+1,data.query)}>Next</Button></nav>}
    {selected && <LoreReviewDetail key={key(selected)} item={selected} onClose={()=>setSelected(null)} onReviewed={()=>{setReviewed(previous=>new Set(previous).add(key(selected)));setSelected(null);startTransition(()=>router.refresh());}}/>}
  </div>;
}
