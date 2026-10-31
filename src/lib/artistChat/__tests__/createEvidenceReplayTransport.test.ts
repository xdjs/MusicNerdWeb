import { createEvidenceReplayTransport } from '../createEvidenceReplayTransport';
import { ReadableStream } from 'node:stream/web';
beforeAll(()=>{Object.assign(globalThis,{ReadableStream});});
afterEach(()=>{jest.useRealTimers();jest.restoreAllMocks();});
it('streams fixtures without fetch and stops pending output on abort',async()=>{
 jest.useFakeTimers();const fetcher=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw new Error('Network forbidden')});
 const controller=new AbortController();const transport=createEvidenceReplayTransport();
 const stream=await transport.sendMessages({trigger:'submit-message',chatId:'test',messageId:undefined,messages:[{id:'u',role:'user',parts:[{type:'text',text:'Show literal brackets'}]}],abortSignal:controller.signal});
 const reader=stream.getReader();await reader.read();await reader.read();jest.advanceTimersByTime(400);
 const source=await reader.read();const passage=await reader.read();expect(source.value?.type).toBe('source-url');expect(passage.value).toMatchObject({type:'data-evidence-passage',data:{text:expect.stringContaining('[Artist Doc] [1] & <b>')}});
 controller.abort();jest.advanceTimersByTime(5000);expect((await reader.read()).done).toBe(true);expect(fetcher).not.toHaveBeenCalled();
 expect(await transport.reconnectToStream({chatId:'test'})).toBeNull();
});
it('unknown prompts fail closed without a network fallback',async()=>{
 jest.useFakeTimers();const fetcher=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw new Error('Network forbidden')});
 const stream=await createEvidenceReplayTransport().sendMessages({trigger:'regenerate-message',chatId:'test',messageId:undefined,abortSignal:undefined,messages:[{id:'u',role:'user',parts:[{type:'text',text:'Something else'}]}]});const reader=stream.getReader();await reader.read();await reader.read();jest.advanceTimersByTime(400);
 expect((await reader.read()).value).toMatchObject({type:'data-evidence-status',data:{code:'validation_failed'}});jest.advanceTimersByTime(2500);await reader.read();expect((await reader.read()).done).toBe(true);expect(fetcher).not.toHaveBeenCalled();
});
