import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import UserNamePrompt from '../UserNamePrompt';
it('uses the approved copy and explicitly saves an unchanged generated name',async()=>{
 const save=jest.fn().mockResolvedValue(undefined);
 render(<UserNamePrompt name="Aux Bandit" onSave={save} onDismiss={jest.fn()} />);
 expect(screen.getByText(/Keep it or enter your own./)).toBeInTheDocument();
 expect(screen.getByLabelText('User name')).toHaveValue('Aux Bandit');
 fireEvent.click(screen.getByRole('button',{name:'Continue'}));
 await waitFor(()=>expect(save).toHaveBeenCalledWith('Aux Bandit'));
});
it('keeps an unavailable choice editable with a clear error',async()=>{
 render(<UserNamePrompt name="Aux Bandit" onSave={jest.fn().mockRejectedValue(new Error('That user name is already taken. Try another.'))} onDismiss={jest.fn()} />);
 fireEvent.change(screen.getByLabelText('User name'),{target:{value:'Taken Name'}});
 fireEvent.click(screen.getByRole('button',{name:'Continue'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('already taken');
 expect(screen.getByLabelText('User name')).toHaveValue('Taken Name');
});
