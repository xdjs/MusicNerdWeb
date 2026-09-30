import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClaimsDataTable from '../claims-data-table';
import { claimsColumns, type ClaimRow } from '../claims-columns';
import { approveClaimAction } from '@/app/actions/adminClaimActions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

jest.mock('@/app/actions/adminClaimActions', () => ({ approveClaimAction: jest.fn(), rejectClaimAction: jest.fn(), revokeClaimAction: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('@/hooks/use-toast', () => ({ useToast: jest.fn() }));

it('surfaces failed research after approval and refreshes the committed claim state', async () => {
    const refresh = jest.fn();
    const toast = jest.fn();
    jest.mocked(useRouter).mockReturnValue({ refresh } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(useToast).mockReturnValue({ toast } as unknown as ReturnType<typeof useToast>);
    const warning = 'Claim approved, but research could not be queued. Use Search web for sources to retry.';
    jest.mocked(approveClaimAction).mockResolvedValue({ success: true, warning });
    const claim: ClaimRow = { id: 'claim', artistId: 'artist', artistName: 'Artist', status: 'pending', referenceCode: 'MN-TEST', artistInstagram: null, userEmail: null, userName: 'Requester', createdAt: '2026-09-28T00:00:00Z' };
    render(<ClaimsDataTable columns={claimsColumns} data={[claim]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Approve claim for Artist' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Research needs attention', description: warning })));
    expect(approveClaimAction).toHaveBeenCalledWith('claim');
    expect(refresh).toHaveBeenCalledTimes(1);
});
