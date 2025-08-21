import { render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AutoRefresh from '@/app/_components/AutoRefresh';

// Mock next-auth/react
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock next/navigation
const mockRouter = {
  refresh: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

// Mock window.dispatchEvent
const mockDispatchEvent = jest.fn();
Object.defineProperty(window, 'dispatchEvent', {
  value: mockDispatchEvent,
});

describe('AutoRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  it('should show loading spinner when session is loading', () => {
    mockUseSession.mockReturnValue({
      status: 'loading',
      data: null,
      update: jest.fn(),
    });

    render(<AutoRefresh />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByAltText('Loading')).toBeInTheDocument();
  });

  it('should not trigger refresh when session is already authenticated on initial load', async () => {
    mockUseSession.mockReturnValue({
      status: 'authenticated',
      data: { user: { id: 'test-user' } },
      update: jest.fn(),
    });

    render(<AutoRefresh />);

    await waitFor(() => {
      expect(mockRouter.refresh).not.toHaveBeenCalled();
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });
  });

  it('should trigger refresh when session changes from unauthenticated to authenticated', async () => {
    // First render with unauthenticated status
    const { rerender } = render(<AutoRefresh />);
    
    mockUseSession.mockReturnValue({
      status: 'unauthenticated',
      data: null,
      update: jest.fn(),
    });
    
    rerender(<AutoRefresh />);

    // Then change to authenticated
    mockUseSession.mockReturnValue({
      status: 'authenticated',
      data: { user: { id: 'test-user' } },
      update: jest.fn(),
    });

    rerender(<AutoRefresh />);

    await waitFor(() => {
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('autoRefreshSkipReload', 'true');
    });

    // Wait for the timeout to trigger
    await waitFor(() => {
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sessionUpdated',
          detail: expect.objectContaining({
            status: 'authenticated',
            session: { user: { id: 'test-user' } }
          })
        })
      );
      expect(mockRouter.refresh).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('should not trigger refresh when skip flag is set', async () => {
    mockSessionStorage.getItem.mockReturnValue('true');
    
    const { rerender } = render(<AutoRefresh />);
    
    mockUseSession.mockReturnValue({
      status: 'unauthenticated',
      data: null,
      update: jest.fn(),
    });
    
    rerender(<AutoRefresh />);

    mockUseSession.mockReturnValue({
      status: 'authenticated',
      data: { user: { id: 'test-user' } },
      update: jest.fn(),
    });

    rerender(<AutoRefresh />);

    await waitFor(() => {
      expect(mockRouter.refresh).not.toHaveBeenCalled();
      expect(mockSessionStorage.setItem).not.toHaveBeenCalledWith('autoRefreshSkipReload', 'true');
    });
  });

  it('should not trigger refresh when session data is missing', async () => {
    const { rerender } = render(<AutoRefresh />);
    
    mockUseSession.mockReturnValue({
      status: 'unauthenticated',
      data: null,
      update: jest.fn(),
    });
    
    rerender(<AutoRefresh />);

    // Change to authenticated but without session data
    mockUseSession.mockReturnValue({
      status: 'authenticated',
      data: null,
      update: jest.fn(),
    });

    rerender(<AutoRefresh />);

    await waitFor(() => {
      expect(mockRouter.refresh).not.toHaveBeenCalled();
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });
  });

  it('should use custom sessionStorageKey when provided', async () => {
    const customKey = 'customRefreshKey';
    const { rerender } = render(<AutoRefresh sessionStorageKey={customKey} />);
    
    mockUseSession.mockReturnValue({
      status: 'unauthenticated',
      data: null,
      update: jest.fn(),
    });
    
    rerender(<AutoRefresh sessionStorageKey={customKey} />);

    mockUseSession.mockReturnValue({
      status: 'authenticated',
      data: { user: { id: 'test-user' } },
      update: jest.fn(),
    });

    rerender(<AutoRefresh sessionStorageKey={customKey} />);

    await waitFor(() => {
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(customKey, 'true');
    });
  });

  it('should clean up timeout on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    
    const { unmount } = render(<AutoRefresh />);
    
    unmount();
    
    // clearTimeout should be called during cleanup
    expect(clearTimeoutSpy).toHaveBeenCalled();
    
    clearTimeoutSpy.mockRestore();
  });
});
