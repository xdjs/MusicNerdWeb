import {verifyPreviewCaptureReceipts as verify} from '../verifyPreviewCaptureReceipts';
function sequence(){
 const base={version:2,requestId:'request',estimateOnly:true,limitUsd:.15};
 let held=0,observed=0;const events:Record<string,unknown>[]=[];
 const emit=(event:Record<string,unknown>)=>events.push({...base,reservedUsd:held,observedUpperEstimateUsd:observed,...event});
 const reserve=(step:number,bytes:number)=>{const value=((bytes+2048)*4400+1024*11000)/1e9;held+=value;emit({phase:'reserved',step,preparedBytes:bytes,inputTokenEstimate:bytes+2048,outputTokens:1024});return value;};
 const reconcile=(step:number,input:number,output:number)=>{const value=(input*4400+output*11000)/1e9;observed+=value;emit({phase:'reconciled',step,inputTokens:input,outputTokens:output,generationId:`gen-${step}`,finishReason:'tool-calls',accounting:'reservation_retained',settlementUsd:null});return value;};
 const r1=reserve(1,4000);emit({phase:'tool',sequence:1,tool:'searchSources',stage:'called'});emit({phase:'tool',sequence:2,tool:'searchSources',stage:'returned'});const u1=reconcile(1,1100,100);
 reserve(2,9000);emit({phase:'tool',sequence:3,tool:'readSource',stage:'called'});emit({phase:'tool',sequence:4,tool:'readSource',stage:'returned'});reconcile(2,2400,200);
 const settlement=u1+.000001;held=held-r1+settlement;emit({phase:'settled',step:1,generationId:'gen-1',settlementUsd:settlement,reportedTotalUsd:u1,reportedSurchargeUsd:.000001});emit({phase:'accounting_checked',elapsedMs:25});
 reserve(3,10000);emit({phase:'tool',sequence:5,tool:'selectPassage',stage:'called'});emit({phase:'tool',sequence:6,tool:'selectPassage',stage:'returned'});reconcile(3,3000,200);emit({phase:'complete',attempts:3,reconciled:3});return events;
}
it('accepts a multi-source, three-step trajectory with deferred receipt settlement and surcharge',()=>expect(verify(sequence())).toBe(true));
it.each(['generation','duplicate','missing','request','fee','count'])('rejects %s corruption',kind=>{
 const e=sequence();const index=e.findIndex(x=>x.phase==='settled');
 if(kind==='generation')e[index].generationId='other';
 if(kind==='duplicate')e.splice(index,0,{...e[index]});
 if(kind==='missing')e.pop();
 if(kind==='request')e[3].requestId='other';
 if(kind==='fee')e[index].reportedSurchargeUsd=.01;
 if(kind==='count')e[e.length-1].attempts=4;
 expect(verify(e)).toBe(false);
});
