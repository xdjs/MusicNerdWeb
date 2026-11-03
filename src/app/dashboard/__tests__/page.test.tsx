import { render, waitFor } from '@testing-library/react';
import { useMusicNerdUser } from '@/hooks/useMusicNerdUser';
import { requestUserApi } from '@/lib/user/requestUserApi';
import DashboardRedirect from '../page';

const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('@/lib/user/requestUserApi', () => ({ requestUserApi: jest.fn() }));

const mockUser = useMusicNerdUser as jest.Mock;
const mockRequest = requestUserApi as jest.Mock;

function signedIn() {
  mockUser.mockReturnValue({ user: { id: 'u1' }, status: 'authenticated', isError: false, refetch: jest.fn() });
}

function hasClaim(artistId: string | null) {
  mockRequest.mockResolvedValue({ json: () => Promise.resolve({ status: 'ok', hasClaim: !!artistId, artistId }) });
}

describe('/dashboard (redirect shim)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends a claimed owner to their artist profile', async () => {
    signedIn();
    hasClaim('artist-9');
    render(<DashboardRedirect />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/artist/artist-9'));
    expect(mockRequest).toHaveBeenCalledWith('/api/user/has-claim', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('sends a signed-in user with no claim home', async () => {
    signedIn();
    hasClaim(null);
    render(<DashboardRedirect />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });

  it('sends a signed-out visitor home without asking the API', async () => {
    mockUser.mockReturnValue({ user: null, status: 'unauthenticated', isError: false, refetch: jest.fn() });
    render(<DashboardRedirect />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('waits while the account is loading', () => {
    mockUser.mockReturnValue({ user: null, status: 'loading', isError: false, refetch: jest.fn() });
    render(<DashboardRedirect />);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('sends the user home when the claim lookup fails', async () => {
    signedIn();
    mockRequest.mockRejectedValue(new Error('offline'));
    render(<DashboardRedirect />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });
});
