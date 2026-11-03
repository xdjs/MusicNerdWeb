'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MusicNerdSelect from '@/components/ui/MusicNerdSelect';
import type { ReviewQueue } from '@/lib/admin/adminReadTypes';
import { useRefreshAdmin } from '@/hooks/useRefreshAdmin';
import type { ReviewItem } from '@/lib/contributions/adminReviewTypes';
import LoreReviewRow from './LoreReviewRow';
import { reviewAdminItem, type ReviewAction } from './reviewAdminItem';

/** All contribution types share one ordered, searchable list and one details surface. */
export default function LoreReviewQueue({data}: {data:ReviewQueue}) {
  const router=useRouter();
  const refreshAdmin=useRefreshAdmin();
  const [pending,startTransition]=useTransition();
  const [selected,setSelected]=useState<Set<string>>(()=>new Set());
  const [editing,setEditing]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const inFlight=useRef(false);
  const [errors,setErrors]=useState<Record<string,string>>({});
  const [message,setMessage]=useState('');
  const [reviewed,setReviewed]=useState<Set<string>>(()=>new Set());
  const searchRef=useRef<HTMLInputElement>(null);
  const key=(item:ReviewItem)=>`${item.type}:${item.id}`;
  const hidden=data.items.filter(item=>reviewed.has(key(item)));
  const items=data.items.filter(item=>!reviewed.has(key(item)));
  const chosen=items.filter(item=>selected.has(key(item)));
  const approvals=chosen.filter(item=>item.type!=='corrections');
  const sources=chosen.filter(item=>item.type==='sources');
  const corrections=chosen.filter(item=>item.type==='corrections');
  async function review(targets:ReviewItem[],action:ReviewAction) {
    if(inFlight.current || editing || !targets.length) return;
    inFlight.current=true;setBusy(true);setMessage('');
    let succeeded=0;
    for(const item of targets) {
      try {
        await reviewAdminItem(item,action);
        succeeded++;
        setReviewed(previous=>new Set(previous).add(key(item)));
        setSelected(previous=>{const next=new Set(previous);next.delete(key(item));return next;});
        setErrors(previous=>{const next={...previous};delete next[key(item)];return next;});
      } catch(error) {setSelected(previous=>new Set(previous).add(key(item)));setErrors(previous=>({...previous,[key(item)]:error instanceof Error?error.message:'Review failed. Try again.'}));}
    }
    setMessage(`${succeeded} of ${targets.length} items reviewed.${succeeded<targets.length?' Failed items remain selected for retry.':''}`);
    inFlight.current=false;setBusy(false);
    startTransition(()=>{void refreshAdmin();});
  }
  const counts={...data.counts};
  hidden.forEach(item=>{counts[item.type]=Math.max(0,counts[item.type]-1);});
  const total=data.total-hidden.length;
  function navigate(type=data.type,page=1,query=searchRef.current?.value ?? data.query) {
    if(inFlight.current || editing) return;
    const params=new URLSearchParams({section:'lore',reviewType:type,reviewPage:String(page)});
    if(query.trim()) params.set('reviewQuery',query.trim());
    startTransition(()=>router.push(`/admin?${params}`,{scroll:false}));
  }
  return <div className="min-w-0 space-y-4" aria-busy={pending||busy}>
    <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={event=>{event.preventDefault();navigate();}}>
      <div className="min-w-0 flex-1"><label htmlFor="review-search" className="mb-2 block text-xs text-muted-foreground">Search</label><div className="flex min-h-11 rounded-xl border border-border bg-background"><input id="review-search" ref={searchRef} type="search" name="reviewQuery" defaultValue={data.query} placeholder="Search artist, submission or contributor" maxLength={100} className="min-w-0 flex-1 rounded-xl bg-transparent px-3 text-sm"/><button type="submit" aria-label="Search reviews" disabled={pending||busy||!!editing} className="min-h-11 px-3"><Search size={18}/></button></div></div>
      <div className="sm:w-52"><label htmlFor="review-type" className="mb-2 block text-xs text-muted-foreground">Review type</label><MusicNerdSelect id="review-type" label="Review type" value={data.type} disabled={pending||busy||!!editing} onValueChange={type=>navigate(type as typeof data.type)} options={[
        {value:'all',label:`All (${counts.links+counts.sources+counts.corrections})`},{value:'links',label:`Links (${counts.links})`},{value:'sources',label:`Lore sources (${counts.sources})`},{value:'corrections',label:`About corrections (${counts.corrections})`},
      ]}/></div>
    </form>
    <div className="flex items-center justify-between text-xs text-muted-foreground"><p role="status">{pending?'Updating…':`${total.toLocaleString()} pending ${total===1?'item':'items'}`}</p><span>Newest first</span></div>
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" aria-label="Select this page" checked={items.length>0&&chosen.length===items.length} disabled={pending||busy||!!editing||!items.length} onChange={event=>setSelected(event.target.checked?new Set(items.map(key)):new Set())} className="h-5 w-5 accent-pastypink"/>Select this page</label>
      <span className="text-xs text-muted-foreground">{chosen.length} selected</span>
      {chosen.length>0 && <button disabled={busy||!!editing} onClick={()=>setSelected(new Set())} className="text-xs underline">Clear</button>}
      {approvals.length>0 && <Button disabled={busy||pending||!!editing} onClick={()=>void review(approvals,'approved')}>Approve selected ({approvals.length})</Button>}
      {sources.length>0 && <Button variant="outline" disabled={busy||pending||!!editing} onClick={()=>void review(sources,'rejected')}>Reject sources ({sources.length})</Button>}
      {corrections.length>0 && <><Button disabled={busy||pending||!!editing} onClick={()=>void review(corrections,'resolved')}>Resolve reports ({corrections.length})</Button><Button variant="outline" disabled={busy||pending||!!editing} onClick={()=>void review(corrections,'dismissed')}>Dismiss reports ({corrections.length})</Button></>}
      {busy && <span role="status" className="text-sm">Reviewing…</span>}
    </div>
    {message && <p role="status" className="text-sm">{message}</p>}
    <ul aria-label="Pending reviews" className="overflow-hidden rounded-2xl border border-border divide-y divide-border">
      {items.map(item=><LoreReviewRow key={key(item)} item={item} selected={selected.has(key(item))} disabled={pending||busy||!!editing} error={errors[key(item)]} onSelect={()=>setSelected(previous=>{const next=new Set(previous);if(next.has(key(item)))next.delete(key(item));else next.add(key(item));return next;})} onReview={action=>void review([item],action)} onEditingChange={value=>setEditing(value?key(item):null)} onSaved={()=>{
        setReviewed(previous=>new Set(previous).add(key(item)));
        setSelected(previous=>{const next=new Set(previous);next.delete(key(item));return next;});
        setMessage('About updated and report resolved.');
        startTransition(()=>{void refreshAdmin();});
      }}/>)}
      {!items.length && <li className="p-8 text-center text-sm text-muted-foreground">No pending items match these filters.</li>}
    </ul>
    {(data.total>data.pageSize || data.page>1) && <nav aria-label="Review pages" className="flex items-center justify-between text-sm"><Button variant="outline" disabled={pending||busy||!!editing||data.page<=1} onClick={()=>navigate(data.type,data.page-1,data.query)}>Previous</Button><span>Page {data.page} of {Math.max(1,Math.ceil(data.total/data.pageSize))}</span><Button variant="outline" disabled={pending||busy||!!editing||data.page*data.pageSize>=data.total} onClick={()=>navigate(data.type,data.page+1,data.query)}>Next</Button></nav>}
  </div>;
}
