'use client';

import {useMemo, useState} from 'react';
import InterviewOffer from '@/app/artist/[id]/_components/onboarding/InterviewOffer';
import {EditModeContext} from '@/app/_components/EditModeContext';
import type {InterviewTransport} from '@/lib/interview/interviewTransport';
import type {InterviewQuestion} from '@/app/actions/interviewActions';

const storageKey = 'mn-local-interview-preview';
type PreviewState = {reason:'first'|'new-material'; offered:boolean; questions:InterviewQuestion[]; answers:Record<string,string|null>};
const questions: InterviewQuestion[] = [
 {key:'studio-one',question:'What was the first sound or idea that became your latest track?'},
 {key:'studio-two',question:'Was there a moment in the studio that changed the direction of the song?'},
 {key:'studio-three',question:'What would you want someone to notice on their second listen?'},
];
const fresh = ():PreviewState => ({reason:'new-material',offered:false,questions,answers:{}});
function read():PreviewState {try{return JSON.parse(localStorage.getItem(storageKey)??'null') as PreviewState ?? fresh();}catch{return fresh();}}

/** Review-only simulation around the actual interview components. No server writes. */
export default function InterviewPreview({artistId, artistName}: {artistId:string; artistName:string}) {
 const [revision,setRevision]=useState(0);
 const [sent,setSent]=useState<string[]>([]);
 const transport=useMemo<InterviewTransport>(()=>({
  invite:async()=>{
   const state=read();const remaining=state.questions.filter(q=>!(q.key in state.answers));
   setSent(Object.values(state.answers).filter((a):a is string=>!!a));
   return remaining.length ? {show:true,reason:state.reason,resuming:state.offered,draftScope:'local-preview',questions:remaining} : {show:false};
  },
  offered:async()=>{const state=read();state.offered=true;localStorage.setItem(storageKey,JSON.stringify(state));return {success:true};},
  answer:async input=>{const state=read();state.answers[input.questionKey]=input.answer;state.offered=true;localStorage.setItem(storageKey,JSON.stringify(state));setSent(Object.values(state.answers).filter((a):a is string=>!!a));return {success:true};},
  finish:async()=>({success:true}),
 }),[]);
 const reset=(reason:'first'|'new-material')=>{
  for(const q of questions)localStorage.removeItem(`mn-interview-draft:${JSON.stringify(['local-preview',artistId,q.key])}`);
  localStorage.setItem(storageKey,JSON.stringify({...fresh(),reason}));setSent([]);setRevision(v=>v+1);
 };
 return <div id="interview-preview" className="space-y-3 text-foreground">
  <EditModeContext.Provider value={{canEdit:true,isEditing:false,toggle:()=>{}}}>
   <InterviewOffer key={revision} artistId={artistId} artistName={artistName} transport={transport}/>
  </EditModeContext.Provider>
  <details className="text-xs text-muted-foreground">
   <summary className="cursor-pointer py-2">Interview preview · sample questions</summary>
   <div className="flex flex-wrap gap-2 py-2 text-foreground">
    <button onClick={()=>reset('first')} className="min-h-11 rounded-full border px-3 py-2">First interview</button>
    <button onClick={()=>reset('new-material')} className="min-h-11 rounded-full border px-3 py-2">New activity</button>
    <button onClick={()=>setRevision(v=>v+1)} className="min-h-11 rounded-full border px-3 py-2">Return to profile</button>
   </div>
   <p className="py-2">Interview actions only affect this browser. Your real profile is unchanged.</p>
   {sent.map((answer,i)=><blockquote key={i} className="my-2 rounded-xl border p-3 text-foreground">{answer}</blockquote>)}
  </details>
 </div>;
}
