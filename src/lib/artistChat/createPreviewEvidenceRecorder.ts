import {verifyPreviewCaptureReceipts} from './verifyPreviewCaptureReceipts';

export type PreviewCapture = {
    id: string; url: string; requestBody: string; startedAt: string;
    status: 'recording' | 'complete' | 'invalid'; reason: string | null; httpStatus: number | null;
    rawSse: string; bytes: number; messageId: string | null; passageIds: string[];
    firstByteMs: number | null; firstPassageMs: number | null; firstRenderMs: number | null; completedMs: number | null;
    receipts: Record<string, unknown>[];
};

/** Page-owned transport hook. No global interception, storage, logging or upload. */
export function createPreviewEvidenceRecorder(options: {
    expectedUrl: () => string;
    onChange: () => void;
    fetcher?: typeof fetch;
}) {
    const records: PreviewCapture[] = [];
    const started = new Map<string, number>();
    const stopStreams = new Map<string, () => void>();
    let active = false, blocked = false;
    const snapshot = () => records.map(r => ({...r, passageIds:[...r.passageIds], receipts:r.receipts.map(e=>({...e}))}));
    const notify = () => { try { options.onChange(); } catch { blocked = true; for (const record of records) if (record.status !== 'invalid') { record.status = 'invalid'; record.reason = 'capture_display_failed'; stopStreams.get(record.id)?.(); } throw new Error('Capture display failed'); } };
    const captureFetch: typeof fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (blocked || active || records.length >= 2 || url !== options.expectedUrl() || init?.method !== 'POST' || typeof init.body !== 'string' || new TextEncoder().encode(init.body).length > 65536) throw new Error('Preview recorder cannot admit this request');
        const body = JSON.parse(init.body);
        if (body.responseMode !== 'source_passages' || !Array.isArray(body.messages) || Object.keys(body).some(k=>!['responseMode','messages'].includes(k))) throw new Error('Evidence mode required');
        const start = performance.now();
        const r: PreviewCapture = {id:crypto.randomUUID(),url,requestBody:init.body,startedAt:new Date().toISOString(),status:'recording',reason:null,httpStatus:null,rawSse:'',bytes:0,messageId:null,passageIds:[],firstByteMs:null,firstPassageMs:null,firstRenderMs:null,completedMs:null,receipts:[]};
        records.push(r); started.set(r.id,start); active = true;
        const abort = new AbortController();
        const signal = init.signal ? AbortSignal.any([init.signal,abort.signal]) : abort.signal;
        let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
        const fail = (reason: string) => {
            if (r.status !== 'recording') return;
            r.status='invalid';r.reason=reason;r.completedMs=performance.now()-start;
            active=false;blocked=true;abort.abort();void reader?.cancel().catch(()=>{});notify();
        };
        stopStreams.set(r.id, () => { abort.abort(); void reader?.cancel().catch(()=>{}); });
        signal.addEventListener('abort',()=>fail('aborted'),{once:true});
        let pending = '', terminal = false, finish = false;
        const decoder = new TextDecoder('utf-8',{fatal:true});
        const parse = (text: string) => {
            r.rawSse += text; pending += text;
            let boundary: RegExpExecArray | null;
            while ((boundary = /\r?\n\r?\n/.exec(pending))) {
                const frame = pending.slice(0,boundary.index);pending=pending.slice(boundary.index+boundary[0].length);
                const data = frame.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');
                if (!data) continue;
                if (terminal) throw new Error('Data after terminal');
                if (data==='[DONE]') {terminal=true;continue;}
                const e = JSON.parse(data);
                if (e.type==='start') {if(r.messageId || typeof e.messageId!=='string')throw new Error('Invalid identity');r.messageId=e.messageId;}
                if (e.type==='finish') {if(finish)throw new Error('Duplicate finish');finish=true;}
                if (e.type==='data-preview-budget') {if(!e.data || typeof e.data!=='object' || r.receipts.length>=200)throw new Error('Invalid receipts');r.receipts.push(e.data);}
                if (e.type==='data-evidence-passage') {if(typeof e.id!=='string' || r.passageIds.includes(e.id))throw new Error('Invalid passage identity');r.passageIds.push(e.id);r.firstPassageMs??=performance.now()-start;}
                if (e.type==='error') throw new Error('Stream error');
            }
        };
        try {
            notify();
            const response = await (options.fetcher ?? fetch)(input,{...init,signal});
            r.httpStatus=response.status;
            if(!response.ok || !response.body || !response.headers.get('content-type')?.includes('text/event-stream') || response.redirected) {void response.body?.cancel();fail('http_or_content_type');throw new Error('Capture response rejected');}
            reader=response.body.getReader();
            const stream = new ReadableStream<Uint8Array>({
                async pull(controller) {
                    try {
                        if (r.status !== 'recording') throw new Error('Capture invalid');
                        signal.throwIfAborted();
                        const chunk=await reader!.read();
                        if (r.status !== 'recording') throw new Error('Capture invalid');
                        signal.throwIfAborted();
                        if(chunk.done) {
                            parse(decoder.decode());
                            if(pending.trim() || !terminal || !finish || !r.messageId || !verifyPreviewCaptureReceipts(r.receipts))throw new Error('Incomplete capture');
                            r.completedMs=performance.now()-start;notify();r.status='complete';active=false;notify();stopStreams.delete(r.id);controller.close();reader!.releaseLock();return;
                        }
                        r.bytes+=chunk.value.byteLength;
                        if(r.bytes>262144)throw new Error('Capture overflow');
                        r.firstByteMs??=performance.now()-start;
                        parse(decoder.decode(chunk.value,{stream:true}));
                        controller.enqueue(chunk.value); // Same bytes, one consumer read; never drain ahead.
                    } catch {fail('stream_or_receipt_integrity');controller.error(new Error('Preview capture invalid'));}
                },
                cancel() {fail('cancelled');},
            },{highWaterMark:0});
            return new Response(stream,{status:response.status,statusText:response.statusText,headers:response.headers});
        } catch {fail('request_failed');throw new Error('Preview capture invalid');}
    };
    return {
        fetch:captureFetch, snapshot,
        markRendered: (messageId: string, passageId: string) => {
            const matches=records.filter(r=>r.messageId===messageId && r.passageIds.includes(passageId));
            if(matches.length!==1)return;
            const r=matches[0];if(r.firstRenderMs!==null)return;
            r.firstRenderMs=performance.now()-started.get(r.id)!;notify();
        },
    };
}
