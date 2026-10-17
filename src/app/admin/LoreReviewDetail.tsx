'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { approveUgcAdminAction } from '@/app/actions/serverActions';
import { updateSourceStatus } from '@/app/actions/dashboardActions';
import type { ReviewItem } from '@/lib/contributions/adminReviewTypes';
import { researchAttribution } from '@/lib/activity/researchAttribution';
import BioCorrectionReview from './bio-corrections/BioCorrectionReview';

export default function LoreReviewDetail({item,onClose,onReviewed}: {item:ReviewItem;onClose:()=>void;onReviewed:()=>void}) {
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const inFlight=useRef(false);
  async function review(status:'approved'|'rejected') {
    if(inFlight.current) return;
    inFlight.current=true;setBusy(true);setError('');
    try {
      const result=item.type==='links' ? await approveUgcAdminAction([item.id]) : await updateSourceStatus(item.id,status,'pending');
      const success='success' in result ? result.success : result.status==='success';
      if(!success) throw new Error(('error' in result ? result.error : 'message' in result ? result.message : undefined) || 'Could not review this item.');
      onReviewed();
    } catch(cause) {setError(cause instanceof Error ? cause.message : 'Could not review this item. Refresh and try again.');}
    finally {inFlight.current=false;setBusy(false);}
  }
  const actor=item.actorName || (item.actorKind==='user'?'Deleted account':item.actorKind==='system'?'Music Nerd system':'Unknown account');
  const type=item.type==='links'?'Link submission':item.type==='sources'?'Lore source':'About correction';
  return <Dialog open onOpenChange={open=>{if(!open&&!busy) onClose();}}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>{item.artistName || 'Unknown artist'}</DialogTitle><DialogDescription>{type} · Awaiting review</DialogDescription></DialogHeader>
      <div className="space-y-4 text-sm">
        <p className="whitespace-pre-wrap break-words font-medium">{item.type==='corrections' ? ({incorrect:'Incorrect information',wrong_artist:'This is about a different artist',outdated:'Outdated information',other:'Something else'}[item.reason ?? ''] || 'About correction') : item.title || type}</p>
        {item.type==='corrections' && <>
          <div><h3 className="mb-2 font-medium">Reported About</h3><blockquote className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border p-4 leading-relaxed">{item.bioSnapshot}</blockquote></div>
          {item.details && <div><h3 className="mb-1 font-medium">Suggested correction</h3><p className="whitespace-pre-wrap break-words">{item.details}</p></div>}
          <p className="text-muted-foreground">Use the artist editor to change the bio. Resolving this report does not edit it.</p>
        </>}
        {item.url && (/^https?:\/\//i.test(item.url) ? <a href={item.url} target="_blank" rel="noopener noreferrer" className="block break-all underline underline-offset-4">{item.url}</a> : <p className="break-all">{item.url}</p>)}
        <p className="text-muted-foreground">{item.origin==='research'?researchAttribution(actor,item.trigger).actorLabel:`${item.origin==='user'?'Submitted by':'Recorded account:'} ${actor}`}{item.createdAt && <> · {new Date(item.createdAt).toLocaleString('en-US',{timeZone:'UTC'})} UTC</>}</p>
        <Link href={`/artist/${item.artistId}`} target="_blank" className="inline-flex min-h-11 items-center underline underline-offset-4">Open artist profile ↗</Link>
        {error && <p role="alert" className="text-destructive">{error}</p>}
        {item.type==='corrections' ? <BioCorrectionReview id={item.id} onReviewed={onReviewed}/> : <div className="flex gap-3"><Button disabled={busy} onClick={()=>void review('approved')}>Approve</Button>{item.type==='sources' && <Button variant="outline" disabled={busy} onClick={()=>void review('rejected')}>Reject</Button>}</div>}
      </div>
    </DialogContent>
  </Dialog>;
}
