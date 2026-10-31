'use client';
import {useState} from 'react';
import type {PreviewCapture} from '@/lib/artistChat/createPreviewEvidenceRecorder';

/** Explicit, local-only evidence export. No server logging or automatic upload. */
export default function PreviewEvidenceCapturePanel({records}:{records:PreviewCapture[]}) {
    const [expanded,setExpanded]=useState<string|null>(null);
    const [exportError,setExportError]=useState(false);
    const download=async(record:PreviewCapture)=>{
        try {
            const bytes=new TextEncoder().encode(record.rawSse);
            const digest=await crypto.subtle.digest('SHA-256',bytes);
            const sha256=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
            const blob=new Blob([JSON.stringify({version:1,...record,rawSseSha256:sha256},null,2)],{type:'application/json'});
            const url=URL.createObjectURL(blob);const a=document.createElement('a');
            a.href=url;a.download=`chat-evidence-${record.id}.json`;a.click();
            setTimeout(()=>URL.revokeObjectURL(url),1000);setExportError(false);
        }catch{setExportError(true);}
    };
    return <section aria-label="Preview evidence recorder" className="space-y-3 rounded border border-input p-3 text-foreground">
        <h2 className="font-medium">Local evidence recorder</h2>
        <p className="text-sm">Records saved-source mode only; ordinary chat and offline replay are not captured. Two recorded submissions maximum in this page session. No automatic retries. Records stay in memory until you download them; refreshing loses them. A complete capture is not an answer-quality pass.</p>
        {!records.length?<p role="status">No recorded submissions.</p>:null}
        {records.map((r,index)=><article key={r.id} className="space-y-2 border-t border-input pt-2">
            <p role="status">Request {index+1}: {r.status}{r.reason?` (${r.reason})`:''}</p>
            <p className="break-all text-xs">{r.id} · {r.url}</p>
            <p className="text-xs">First byte: {r.firstByteMs?.toFixed(0)??'—'} ms; first passage arrival: {r.firstPassageMs?.toFixed(0)??'—'} ms; React render commit: {r.firstRenderMs?.toFixed(0)??'—'} ms; stream end: {r.completedMs?.toFixed(0)??'—'} ms. Render commit is not a measured pixel-paint time.</p>
            <button disabled={r.status==='recording'} onClick={()=>void download(r)} className="min-h-11 rounded border border-input px-3 disabled:opacity-50">Download evidence {index+1}</button>
            <button disabled={r.status==='recording'} onClick={()=>setExpanded(expanded===r.id?null:r.id)} className="ml-2 min-h-11 rounded border border-input px-3 disabled:opacity-50">Show evidence {index+1}</button>
            {expanded===r.id?<textarea aria-label={`Recorded evidence ${index+1}`} readOnly value={JSON.stringify({version:1,...r},null,2)} className="h-56 w-full bg-background p-2 font-mono text-xs text-foreground"/>:null}
        </article>)}
        {exportError?<p role="alert">Download could not be prepared. Use Show evidence; do not submit again.</p>:null}
    </section>;
}
