import { readEvidenceAnswer } from '../readEvidenceAnswer';
const source={type:'source-url',sourceId:'1',url:'https://example.com/a',title:'Saved source'};
const passage={type:'data-evidence-passage',id:'p',data:{text:'[1] & <b>literal</b>\nnext',citation:{sourceId:'1',url:source.url,title:source.title},publishedAt:null,activityDate:null,retrievedAt:null}};
it('retains literal text and matching provenance, ignoring mixed generated prose',()=>{
 const result=readEvidenceAnswer([{type:'data-evidence-mode',data:{version:1}},source,passage,{type:'text',text:'Invented guest role'}]);
 expect(result.passages[0].text).toBe(passage.data.text);
 expect(result.active).toBe(true);expect(result.invalid).toBe(false);
});
it('fails closed on mismatched citation or duplicate passage identity',()=>{
 expect(readEvidenceAnswer([source,{...passage,data:{...passage.data,citation:{...passage.data.citation,url:'https://elsewhere.example'}}}]).invalid).toBe(true);
 expect(readEvidenceAnswer([source,passage,passage]).passages).toHaveLength(1);
 expect(readEvidenceAnswer([source,passage,passage]).invalid).toBe(true);
});
it('stops accepting passages after a failure status and does not infer evidence absence',()=>{
 const result=readEvidenceAnswer([source,{type:'data-evidence-status',data:{code:'validation_failed'}},passage]);
 expect(result.passages).toHaveLength(0);expect(result.status).toBe('validation_failed');
});
