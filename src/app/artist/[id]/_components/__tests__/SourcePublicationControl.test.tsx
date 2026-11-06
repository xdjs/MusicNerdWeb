import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SourcePublicationControl from '../SourcePublicationControl';
import { EditModeContext } from '@/app/_components/EditModeContext';
import { setSourcePublicationAction } from '@/app/actions/setSourcePublicationAction';
import type { ArtistVaultSource } from '@/server/db/DbTypes';
const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
jest.mock('@/app/actions/setSourcePublicationAction', () => ({ setSourcePublicationAction: jest.fn() }));
const source = { id: 'source', title: 'Document', status: 'approved', publication: 'inherit', updatedAt: '2026-01-01 00:00:00.123456+00' } as ArtistVaultSource;
beforeEach(() => jest.clearAllMocks());
it('requires explicit save and sends original revision without rounding', async () => {
  (setSourcePublicationAction as jest.Mock).mockResolvedValue({success:true});
  render(<SourcePublicationControl source={source} />);
  fireEvent.change(screen.getByRole('combobox'), {target:{value:'public'}});
  expect(setSourcePublicationAction).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Save publication'}));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('saved'));
  expect(setSourcePublicationAction).toHaveBeenCalledWith({sourceId:'source',publication:'public',expectedUpdatedAt:source.updatedAt});
  expect(refresh).toHaveBeenCalledTimes(1);
});
it('does not auto-retry an uncertain operation', async () => {
  (setSourcePublicationAction as jest.Mock).mockRejectedValue(new Error('transport'));
  render(<SourcePublicationControl source={source} />);
  fireEvent.change(screen.getByRole('combobox'), {target:{value:'private'}});
  fireEvent.click(screen.getByRole('button',{name:'Save publication'}));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Reload before trying again'));
  expect(setSourcePublicationAction).toHaveBeenCalledTimes(1);
  expect(refresh).not.toHaveBeenCalled();
});
it('respects onboarding edit suspension without changing source publication', () => {
  render(<EditModeContext.Provider value={{canEdit:true,isEditing:true,toggle:jest.fn(),editingBlocked:true}}><SourcePublicationControl source={source} /></EditModeContext.Provider>);
  expect(screen.getByRole('combobox')).toBeDisabled();
  expect(screen.getByRole('button')).toBeDisabled();
  expect(setSourcePublicationAction).not.toHaveBeenCalled();
});
