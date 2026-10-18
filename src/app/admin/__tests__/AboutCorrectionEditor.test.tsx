import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AboutCorrectionEditor from '../AboutCorrectionEditor';
const onSaved = jest.fn();
const onEditingChange = jest.fn();
beforeEach(() => { jest.clearAllMocks(); global.fetch = jest.fn(); });
const renderEditor = () => render(<AboutCorrectionEditor reportId="report" disabled={false} onSaved={onSaved} onEditingChange={onEditingChange} />);
it('loads current text, retains edits on conflict, and resolves only after a successful save', async () => {
 (fetch as jest.Mock).mockResolvedValueOnce({ok:true,json:async()=>({bio:'Current published About',revision:'rev'})})
 .mockResolvedValueOnce({ok:false,json:async()=>({error:'About changed. Reload before saving.'})})
 .mockResolvedValueOnce({ok:true,json:async()=>({success:true})});
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
 expect(fetch).toHaveBeenLastCalledWith('/api/admin/bio-corrections/report/about',expect.objectContaining({method:'PUT',body:JSON.stringify({bio:'Corrected About',revision:'rev'})}));
});
it('cancel does not save and opening again fetches fresh text',async()=>{
 (fetch as jest.Mock).mockResolvedValue({ok:true,json:async()=>({bio:'Current About',revision:'rev'})});
 renderEditor();fireEvent.click(screen.getByRole('button',{name:'Edit About'}));
 await screen.findByRole('textbox');fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
 expect(fetch).toHaveBeenCalledTimes(1);expect(onSaved).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Edit About'}));
 await screen.findByRole('textbox');expect(fetch).toHaveBeenCalledTimes(2);
});
