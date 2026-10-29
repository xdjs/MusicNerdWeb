import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClaimsDataTable from '../claims-data-table';
import { claimsColumns, type ClaimRow } from '../claims-columns';
import { reviewClaim } from '../reviewClaim';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

jest.mock('../reviewClaim', () => ({ reviewClaim: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('@/hooks/use-toast', () => ({ useToast: jest.fn() }));

it('surfaces failed research after approval and refreshes the committed claim state', async () => {
    const refresh = jest.fn();
    const toast = jest.fn();
    jest.mocked(useRouter).mockReturnValue({ refresh } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(useToast).mockReturnValue({ toast } as unknown as ReturnType<typeof useToast>);
    const warning = 'Claim approved, but research could not be queued. Use Search web for sources to retry.';
    jest.mocked(reviewClaim).mockResolvedValue({ success: true, warning });
    const claim: ClaimRow = { id: 'claim', artistId: 'artist', artistName: 'Artist', status: 'pending', referenceCode: 'MN-TEST', artistInstagram: null, userEmail: null, userName: 'Requester', createdAt: '2026-09-28T00:00:00Z' };
    render(<ClaimsDataTable columns={claimsColumns} data={[claim]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Approve claim for Artist' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Research needs attention', description: warning })));
    expect(reviewClaim).toHaveBeenCalledWith('claim', 'approve');
    expect(refresh).toHaveBeenCalledTimes(1);
});

it('renders database submission dates on initial and refreshed claim lists without a write', () => {
    jest.mocked(reviewClaim).mockClear();
    jest.mocked(useRouter).mockReturnValue({ refresh: jest.fn() } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(useToast).mockReturnValue({ toast: jest.fn() } as unknown as ReturnType<typeof useToast>);
    const claim: ClaimRow = { id: 'claim', artistId: 'artist', artistName: 'Artist', status: 'pending', referenceCode: 'MN-TEST', artistInstagram: null, userEmail: null, userName: 'Requester', createdAt: '2026-10-11 12:34:56.123456+00' };
    const { rerender } = render(<ClaimsDataTable columns={claimsColumns} data={[claim]} />);
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
    expect(screen.queryByText('Date unavailable')).not.toBeInTheDocument();
    rerender(<ClaimsDataTable columns={claimsColumns} data={[{ ...claim, createdAt: 'bad value' }]} />);
    expect(screen.getByText('Date unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
    expect(reviewClaim).not.toHaveBeenCalled();
});
