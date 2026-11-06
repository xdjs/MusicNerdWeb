import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AboutCorrectionEditor from '../AboutCorrectionEditor';
import { requestAdminApi } from '@/lib/admin/requestAdminApi';
jest.mock('@/lib/admin/requestAdminApi', () => ({ requestAdminApi: jest.fn() }));
const request = requestAdminApi as jest.Mock;
const onSaved = jest.fn();
const onEditingChange = jest.fn();
beforeEach(() => { jest.clearAllMocks(); });
const renderEditor = () => render(<AboutCorrectionEditor reportId="report" disabled={false} onSaved={onSaved} onEditingChange={onEditingChange} />);
it('loads current text, retains edits on conflict, and resolves only after a successful save', async () => {
 request.mockResolvedValueOnce({ok:true,json:async()=>({status:'ok',bio:'Current published About',revision:'rev'})})
 .mockResolvedValueOnce({ok:false,json:async()=>({status:'error',error:'About changed. Reload before saving.'})})
 .mockResolvedValueOnce({ok:true,json:async()=>({status:'ok',success:true})});
 renderEditor();
 fireEvent.click(screen.getByRole('button',{name:'Edit About'}));
 const editor=await screen.findByRole('textbox',{name:'Current About'});
 expect(editor).toHaveValue('Current published About');
 fireEvent.change(editor,{target:{value:'Corrected About'}});
 fireEvent.click(screen.getByRole('button',{name:'Save and resolve'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('About changed');
 expect(editor).toHaveValue('Corrected About');
 expect(onSaved).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Save and resolve'}));
 await waitFor(()=>expect(onSaved).toHaveBeenCalledTimes(1));
 expect(request).toHaveBeenNthCalledWith(1,'/api/admin/bio-corrections/report/about');
 expect(request).toHaveBeenLastCalledWith('/api/admin/bio-corrections/report/about',{method:'PUT',body:{bio:'Corrected About',revision:'rev'}});
});
it('cancel does not save and opening again fetches fresh text',async()=>{
 request.mockResolvedValue({ok:true,json:async()=>({bio:'Current About',revision:'rev'})});
 renderEditor();fireEvent.click(screen.getByRole('button',{name:'Edit About'}));
 await screen.findByRole('textbox');fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
 expect(request).toHaveBeenCalledTimes(1);expect(onSaved).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Edit About'}));
 await screen.findByRole('textbox');expect(request).toHaveBeenCalledTimes(2);
});
