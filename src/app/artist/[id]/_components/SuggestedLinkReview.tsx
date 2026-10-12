'use client';

import {useCallback,useContext,useEffect,useState} from 'react';
import {EditModeContext} from '@/app/_components/EditModeContext';
import {Button} from '@/components/ui/button';

import type {LinkSuggestion as Suggestion} from '@/lib/artistLinkReview/types';

function RecordedTime({value}:{value:string|null}){
 const [text,setText]=useState<string|null>(null);
 useEffect(()=>{const date=value?new Date(value):null;setText(date&&Number.isFinite(date.getTime())?new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'long'}).format(date):null);},[value]);
 return text&&value?<time dateTime={value}>{text}</time>:<span>Date/time unavailable</span>;
}
/** Owner-only review. Contributor and decision metadata always come from server records. */
export default function SuggestedLinkReview({artistId}:{artistId:string}){
 const {refreshProfile,revision}=useContext(EditModeContext);
 const [items,setItems]=useState<Suggestion[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState<string|null>(null),[nextOffset,setNextOffset]=useState<number|null>(null),[loadingMore,setLoadingMore]=useState(false);
 const endpoint=`/api/artist/${encodeURIComponent(artistId)}/link-suggestions`;
 const load=useCallback(async(signal?:AbortSignal,offset=0)=>{const res=await fetch(offset?`${endpoint}?offset=${offset}`:endpoint,{cache:'no-store',signal});const data=await res.json();if(!res.ok||!Array.isArray(data.items))throw new Error(data.error||'Could not load suggested links.');if(!signal?.aborted){setItems(previous=>offset?Array.from(new Map([...previous,...data.items].map((item:Suggestion)=>[`${item.kind}:${item.id}`,item])).values()):data.items);setNextOffset(data.nextOffset??null);setLoading(false);}},[endpoint]);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');void load(controller.signal).catch(e=>{if(!controller.signal.aborted){setError(e instanceof Error?e.message:'Could not load suggested links.');setLoading(false);}});return()=>controller.abort();},[load,revision]);
 async function decide(item:Suggestion,decision:'approve'|'dismiss'|'restore'){
  if(busy)return;setBusy(item.id);setError('');
  try{const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,kind:item.kind,decision})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Could not review this link.');await load();refreshProfile?.();}
  catch(e){setError(e instanceof Error?e.message:'Could not review this link.');}finally{setBusy(null);}
 }
 const pending=items.filter(i=>i.status==='pending'),reviewed=items.filter(i=>i.status!=='pending');
 if(!loading&&!error&&!items.length&&nextOffset===null)return null;
 function card(item:Suggestion){return <article key={`${item.kind}:${item.id}`} className="rounded-xl border border-black/10 p-4 dark:border-white/15">
  <h4 className="text-sm font-semibold text-foreground">{item.title||`${item.platform} profile`}</h4>
  <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-sm text-pink-800 underline dark:text-pastypink">{item.url}</a>
  <p className="mt-2 text-xs text-muted-foreground">{item.origin==='research'?'Found by automated research':<>Suggested by <span className="font-medium">{item.suggestedBy.name||'Unknown contributor'}</span></>}</p>
  <p className="mt-1 text-xs text-muted-foreground"><RecordedTime value={item.submittedAt}/></p>
  {item.status==='pending'?<div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="pink" disabled={!!busy} onClick={()=>void decide(item,'approve')}>{busy===item.id?'Saving…':'Add to Links'}</Button><Button size="sm" variant="glass" className="text-black dark:text-white" disabled={!!busy} onClick={()=>void decide(item,'dismiss')}>Dismiss</Button></div>:<p className="mt-3 text-xs text-muted-foreground">{item.hidden?'Removed from Links':item.status==='approved'?'Approved':'Dismissed'}{item.reviewedBy&&item.reviewedBy.name!=='Not recorded'?<> by <span className="font-medium">{item.reviewedBy.name}</span></>:<> · Reviewer not recorded</>} · <RecordedTime value={item.reviewedAt}/></p>}{item.hidden&&<Button className="mt-2 text-black dark:text-white" variant="glass" size="sm" disabled={!!busy} onClick={()=>void decide(item,'restore')}>Restore link</Button>}
 </article>}
 return <section aria-label="Suggested links" className="mb-6 space-y-3 text-foreground"><h3 className="text-base font-semibold text-foreground">Suggested links{pending.length?` (${pending.length})`:''}</h3><p className="text-sm text-muted-foreground">Check that these profiles are yours before adding them to Links.</p>{loading&&<p role="status" className="text-sm">Loading suggestions…</p>}{error&&<div role="alert" className="text-sm text-red-700 dark:text-red-300">{error}<Button variant="ghost" onClick={()=>{setError('');void load().catch(e=>setError(e.message));}}>Try again</Button></div>}{pending.map(card)}{reviewed.length>0&&<details><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-foreground">Recently reviewed ({reviewed.length})</summary><div className="space-y-3">{reviewed.map(card)}</div></details>}{nextOffset!==null&&<Button variant="glass" className="text-black dark:text-white" disabled={loadingMore||!!busy} onClick={()=>{setLoadingMore(true);setError('');void load(undefined,nextOffset).catch(e=>setError(e.message)).finally(()=>setLoadingMore(false));}}>{loadingMore?'Loading…':'Load more'}</Button>}</section>;
}
