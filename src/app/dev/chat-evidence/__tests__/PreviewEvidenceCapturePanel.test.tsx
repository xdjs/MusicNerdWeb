import {render,screen,fireEvent} from '@testing-library/react';
import PreviewEvidenceCapturePanel from '../PreviewEvidenceCapturePanel';
import type {PreviewCapture} from '@/lib/artistChat/createPreviewEvidenceRecorder';
const record:PreviewCapture={id:'request1',url:'https://api.example/chat',requestBody:'{"messages":[]}',startedAt:'2026-10-31T00:00:00Z',status:'recording',reason:null,httpStatus:200,rawSse:'data: [DONE]\n\n',bytes:14,messageId:'m',passageIds:[],firstByteMs:1,firstPassageMs:null,firstRenderMs:null,completedMs:null,receipts:[]};
it('does not export automatically and exposes records only after completion or failure',()=>{
 const {rerender}=render(<PreviewEvidenceCapturePanel records={[record]} />);
 expect(screen.getByRole('button',{name:'Download evidence 1'})).toBeDisabled();expect(screen.queryByRole('textbox')).toBeNull();
 rerender(<PreviewEvidenceCapturePanel records={[{...record,status:'invalid',reason:'aborted'}]} />);
 expect(screen.getByRole('button',{name:'Download evidence 1'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Show evidence 1'}));
 expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toContain('"reason": "aborted"');
 expect(screen.getByText(/not a measured pixel-paint/)).toBeInTheDocument();
});
