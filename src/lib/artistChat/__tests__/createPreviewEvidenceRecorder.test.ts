/** @jest-environment node */
import {Response as WebResponse} from 'undici';
beforeAll(()=>{globalThis.Response=WebResponse as unknown as typeof Response;});
import {createPreviewEvidenceRecorder} from '../createPreviewEvidenceRecorder';
const url='https://api.example/api/artist/11111111-1111-4111-8111-111111111111/chat';
const request={method:'POST',headers:{Authorization:'NEVER_EXPORT'},body:JSON.stringify({responseMode:'source_passages',messages:[{id:'u1',role:'user',parts:[{type:'text',text:'Who sings?'}]}]})};
const wire=(id='budget1')=>{
 const base={version:2,requestId:id,estimateOnly:true,limitUsd:.15};
 const reserved=((100+2048)*4400+1024*11000)/1e9, used=(10*4400+2*11000)/1e9;
 return [{type:'start',messageId:`message-${id}`},{type:'data-preview-budget',data:{...base,phase:'reserved',step:1,preparedBytes:100,inputTokenEstimate:2148,outputTokens:1024,reservedUsd:reserved,observedUpperEstimateUsd:0}},{type:'data-evidence-passage',id:`passage-${id}`,data:{text:'Rei Álvarez [1] & <b>text</b>'}},{type:'data-preview-budget',data:{...base,phase:'reconciled',step:1,inputTokens:10,outputTokens:2,finishReason:'stop',accounting:'reservation_retained',settlementUsd:null,reservedUsd:reserved,observedUpperEstimateUsd:used}},{type:'data-preview-budget',data:{...base,phase:'complete',attempts:1,reconciled:1,reservedUsd:reserved,observedUpperEstimateUsd:used}},{type:'finish'}].map(x=>'data: '+JSON.stringify(x)+'\n\n').join('')+'data: [DONE]\n\n';
};
it('passes split UTF8/SSE unchanged and associates identical questions separately without headers',async()=>{
 let turn=0;const fetcher=jest.fn(async()=>{const bytes=new TextEncoder().encode(wire(`b${++turn}`));return new Response(new ReadableStream({start(c){for(const b of bytes)c.enqueue(Uint8Array.of(b));c.close()}}),{headers:{'content-type':'text/event-stream'}})});
 const r=createPreviewEvidenceRecorder({expectedUrl:()=>url,fetcher,onChange:()=>{}});
 for(let i=1;i<=2;i++){expect(await (await r.fetch(url,request)).text()).toBe(wire(`b${i}`));r.markRendered(`message-b${i}`,`passage-b${i}`);}
 const captures=r.snapshot();expect(captures).toHaveLength(2);expect(new Set(captures.map(c=>c.id)).size).toBe(2);
 expect(captures.map(c=>c.status)).toEqual(['complete','complete']);expect(captures.every(c=>c.firstRenderMs!==null)).toBe(true);
 expect(JSON.stringify(captures)).not.toContain('NEVER_EXPORT');expect(fetcher).toHaveBeenCalledTimes(2);
 await expect(r.fetch(url,request)).rejects.toThrow();expect(fetcher).toHaveBeenCalledTimes(2);
});
it.each(['missing_terminal','overflow','http','malformed','budget_mismatch'])('fails on %s without resubmitting',async kind=>{
 let body=wire();if(kind==='missing_terminal')body=body.replace('data: [DONE]\n\n','');if(kind==='overflow')body='x'.repeat(262145);if(kind==='malformed')body='data: nope\n\n';if(kind==='budget_mismatch')body=body.replace('"attempts":1','"attempts":2');
 const fetcher=jest.fn(async()=>new Response(body,{status:kind==='http'?503:200,headers:{'content-type':'text/event-stream'}}));
 const r=createPreviewEvidenceRecorder({expectedUrl:()=>url,fetcher,onChange:()=>{}});
 try{await (await r.fetch(url,request)).text()}catch{}
 expect(r.snapshot()[0].status).toBe('invalid');await expect(r.fetch(url,request)).rejects.toThrow();expect(fetcher).toHaveBeenCalledTimes(1);
});
it.each(['abort','cancel'])('invalidates %s and never drains ahead',async action=>{
 let pulls=0; const cancelled=jest.fn(); const signal=new AbortController();
 const fetcher=jest.fn(async()=>new Response(new ReadableStream({pull(c){pulls++;c.enqueue(new TextEncoder().encode('data: {"type":"start","messageId":"m"}\n\n'));},cancel:cancelled},{highWaterMark:0}),{headers:{'content-type':'text/event-stream'}}));
 const r=createPreviewEvidenceRecorder({expectedUrl:()=>url,fetcher,onChange:()=>{}});
 const response=await r.fetch(url,{...request,signal:signal.signal});expect(pulls).toBe(0);
 const reader=response.body!.getReader();await reader.read();expect(pulls).toBe(1);
 if(action==='abort')signal.abort();else await reader.cancel();
 expect(r.snapshot()[0].status).toBe('invalid');expect(cancelled).toHaveBeenCalledTimes(1);
 await expect(r.fetch(url,request)).rejects.toThrow();expect(fetcher).toHaveBeenCalledTimes(1);
});
it('does not export a complete capture when completion observer fails',async()=>{
 let changes=0;
 const r=createPreviewEvidenceRecorder({expectedUrl:()=>url,fetcher:async()=>new Response(wire(),{headers:{'content-type':'text/event-stream'}}),onChange:()=>{if(++changes>1)throw new Error('UI failed');}});
 await expect((await r.fetch(url,request)).text()).rejects.toThrow();expect(r.snapshot()[0].status).toBe('invalid');
});
it('stops an active stream when render notification fails and never revives it',async()=>{
 let failObserver=false;let pulls=0;const cancel=jest.fn();
 const first=wire().split('data: {"type":"data-preview-budget","data":{"version":2,"requestId":"budget1","estimateOnly":true,"limitUsd":0.15,"phase":"reconciled"')[0];
 const r=createPreviewEvidenceRecorder({expectedUrl:()=>url,onChange:()=>{if(failObserver)throw new Error('failed');},fetcher:async()=>new Response(new ReadableStream({pull(c){pulls++;c.enqueue(new TextEncoder().encode(first));},cancel},{highWaterMark:0}),{headers:{'content-type':'text/event-stream'}})});
 const reader=(await r.fetch(url,request)).body!.getReader();await reader.read();failObserver=true;
 expect(()=>r.markRendered('message-budget1','passage-budget1')).toThrow();
 await expect(reader.read()).rejects.toThrow();expect(pulls).toBe(1);expect(cancel).toHaveBeenCalled();expect(r.snapshot()[0].status).toBe('invalid');
});
