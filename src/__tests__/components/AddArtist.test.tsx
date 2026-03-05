// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ── Auth mocks ────────────────────────────────────────────────────────────────
let mockSessionData: any = null;

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: mockSessionData, status: mockSessionData ? 'authenticated' : 'unauthenticated' }),
}));

const mockLogin = jest.fn();
jest.mock('@privy-io/react-auth', () => ({
  useLogin: () => ({ login: mockLogin }),
}));

// ── Server action mock ────────────────────────────────────────────────────────
const mockAddArtist = jest.fn();
jest.mock('@/app/actions/addArtist', () => ({
  addArtist: (...args) => mockAddArtist(...args),
}));

// ── UI component mocks ────────────────────────────────────────────────────────
jest.mock('@/components/ui/button', () => {
  const React = require('react');
  const MockButton = React.forwardRef(
    ({ children, onClick, disabled, variant, size, className, type, ...rest }, ref) => (
      <button ref={ref} onClick={onClick} disabled={disabled} className={className} type={type} {...rest}>
        {children}
      </button>
    )
  );
  MockButton.displayName = 'MockButton';
  return { Button: MockButton };
});

// Dialog mock: no auto-close on click so button clicks don't bubble-close the modal
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogDescription: ({ children }) => <p>{children}</p>,
}));

jest.mock('lucide-react', () => ({
  Plus: () => <svg data-testid="plus-icon" />,
}));

jest.mock('next/link', () => {
  return function MockLink({ children, href, onMouseDown, ...rest }) {
    return <a href={href} onMouseDown={onMouseDown} {...rest}>{children}</a>;
  };
});

// ── Helper: get the submit button (not the dialog title) ──────────────────────
function getSubmitButton() {
  // The submit button is inside dialog-content and contains "Add Artist" span text
  return screen.getAllByRole('button').find(
    (btn) => btn.textContent?.trim() === 'Add Artist'
  )!;
}

// ── Import after mocks ────────────────────────────────────────────────────────
import AddArtist from '@/app/_components/nav/components/AddArtist';

describe('AddArtist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionData = null;
  });

  // ── Unauthenticated ───────────────────────────────────────────────────────
  describe('unauthenticated', () => {
    it('renders the + button', () => {
      render(<AddArtist />);
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
    });

    it('calls Privy login() when the + button is clicked', () => {
      render(<AddArtist />);
      fireEvent.click(screen.getByRole('button'));
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });

    it('does NOT open the modal when unauthenticated', () => {
      render(<AddArtist />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });
  });

  // ── Authenticated – modal ──────────────────────────────────────────────────
  describe('authenticated – modal', () => {
    beforeEach(() => {
      mockSessionData = { user: { id: 'user-1' }, expires: '2099-01-01' };
    });

    it('opens the Add Artist modal when + button is clicked', () => {
      render(<AddArtist />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    it('shows the "Add Artist" dialog title', () => {
      render(<AddArtist />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Add Artist');
    });

    it('shows the Spotify URL input', () => {
      render(<AddArtist />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByPlaceholderText('https://open.spotify.com/artist/...')).toBeInTheDocument();
    });

    it('shows the "Spotify URL" form label', () => {
      render(<AddArtist />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Spotify URL')).toBeInTheDocument();
    });

    it('does NOT call Privy login when authenticated', () => {
      render(<AddArtist />);
      fireEvent.click(screen.getByRole('button'));
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  // ── Form validation ────────────────────────────────────────────────────────
  describe('form validation', () => {
    beforeEach(() => {
      mockSessionData = { user: { id: 'user-1' }, expires: '2099-01-01' };
    });

    it('shows a validation error for an invalid Spotify URL', async () => {
      render(<AddArtist />);
      fireEvent.click(screen.getByRole('button')); // open modal

      const input = screen.getByPlaceholderText('https://open.spotify.com/artist/...');
      fireEvent.change(input, { target: { value: 'not-a-spotify-url' } });
      fireEvent.click(getSubmitButton());

      await waitFor(() => {
        expect(screen.getByText(/spotify.*url.*must be/i)).toBeInTheDocument();
      });
      expect(mockAddArtist).not.toHaveBeenCalled();
    });

    it('does not call addArtist when the URL is a track URL (not artist)', async () => {
      render(<AddArtist />);
      fireEvent.click(screen.getByRole('button'));

      const input = screen.getByPlaceholderText('https://open.spotify.com/artist/...');
      fireEvent.change(input, { target: { value: 'https://open.spotify.com/track/notanartist' } });
      fireEvent.click(getSubmitButton());

      await waitFor(() => {
        expect(mockAddArtist).not.toHaveBeenCalled();
      });
    });
  });

  // ── Form submission – success ─────────────────────────────────────────────
  describe('form submission – success', () => {
    beforeEach(() => {
      mockSessionData = { user: { id: 'user-1' }, expires: '2099-01-01' };
    });

    it('calls addArtist with the extracted Spotify artist ID on submit', async () => {
      mockAddArtist.mockResolvedValue({
        status: 'success',
        message: 'Artist added!',
        artistId: 'abc123',
        artistName: 'Cool Artist',
      });

      render(<AddArtist />);
      fireEvent.click(screen.getByRole('button'));

      const input = screen.getByPlaceholderText('https://open.spotify.com/artist/...');
      fireEvent.change(input, { target: { value: 'https://open.spotify.com/artist/abc123' } });
      fireEvent.click(getSubmitButton());

      await waitFor(() => {
        expect(mockAddArtist).toHaveBeenCalledWith('abc123');
      });
    });

    it('shows "Check out" and "Add links" buttons after successful add', async () => {
      mockAddArtist.mockResolvedValue({
        status: 'success',
        message: 'Artist added!',
        artistId: 'abc123',
        artistName: 'Cool Artist',
      });

      render(<AddArtist />);
      fireEvent.click(screen.getByRole('button'));

      const input = screen.getByPlaceholderText('https://open.spotify.com/artist/...');
      fireEvent.change(input, { target: { value: 'https://open.spotify.com/artist/abc123' } });
      fireEvent.click(getSubmitButton());

      await waitFor(() => {
        expect(screen.getByText('Check out Cool Artist')).toBeInTheDocument();
        expect(screen.getByText('Add links for Cool Artist')).toBeInTheDocument();
      });
    });

    it('shows success message', async () => {
      mockAddArtist.mockResolvedValue({
        status: 'success',
        message: 'Artist added successfully!',
        artistId: 'abc123',
        artistName: 'Cool Artist',
      });

      render(<AddArtist />);
      fireEvent.click(screen.getByRole('button'));

      const input = screen.getByPlaceholderText('https://open.spotify.com/artist/...');
      fireEvent.change(input, { target: { value: 'https://open.spotify.com/artist/abc123' } });
      fireEvent.click(getSubmitButton());

      await waitFor(() => {
        expect(screen.getByText('Artist added successfully!')).toBeInTheDocument();
      });
    });

    it('shows artist links for "exists" status too', async () => {
      mockAddArtist.mockResolvedValue({
        status: 'exists',
        message: 'Artist already exists.',
        artistId: 'xyz789',
        artistName: 'Known Artist',
      });

      render(<AddArtist />);
      fireEvent.click(screen.getByRole('button'));

      const input = screen.getByPlaceholderText('https://open.spotify.com/artist/...');
      fireEvent.change(input, { target: { value: 'https://open.spotify.com/artist/xyz789' } });
      fireEvent.click(getSubmitButton());

      await waitFor(() => {
        expect(screen.getByText('Check out Known Artist')).toBeInTheDocument();
      });
    });
  });

  // ── Form submission – error ───────────────────────────────────────────────
  describe('form submission – error', () => {
    beforeEach(() => {
      mockSessionData = { user: { id: 'user-1' }, expires: '2099-01-01' };
    });

    it('shows error message when addArtist returns error status', async () => {
      mockAddArtist.mockResolvedValue({
        status: 'error',
        message: 'Artist not found on Spotify.',
      });

      render(<AddArtist />);
      fireEvent.click(screen.getByRole('button'));

      const input = screen.getByPlaceholderText('https://open.spotify.com/artist/...');
      fireEvent.change(input, { target: { value: 'https://open.spotify.com/artist/badid999' } });
      fireEvent.click(getSubmitButton());

      await waitFor(() => {
        expect(screen.getByText('Artist not found on Spotify.')).toBeInTheDocument();
      });
    });

    it('does NOT show artist links on error', async () => {
      mockAddArtist.mockResolvedValue({
        status: 'error',
        message: 'Something went wrong.',
      });

      render(<AddArtist />);
      fireEvent.click(screen.getByRole('button'));

      const input = screen.getByPlaceholderText('https://open.spotify.com/artist/...');
      fireEvent.change(input, { target: { value: 'https://open.spotify.com/artist/badid999' } });
      fireEvent.click(getSubmitButton());

      await waitFor(() => {
        expect(screen.queryByText(/Check out/)).not.toBeInTheDocument();
      });
    });
  });

  // ── Post-success link hrefs ────────────────────────────────────────────────
  describe('post-success links', () => {
    beforeEach(() => {
      mockSessionData = { user: { id: 'user-1' }, expires: '2099-01-01' };
    });

    it('links "Check out" to /artist/{id}', async () => {
      mockAddArtist.mockResolvedValue({
        status: 'success',
        message: 'Done!',
        artistId: 'abc123',
        artistName: 'Test Artist',
      });

      render(<AddArtist />);
      fireEvent.click(screen.getByRole('button'));

      const input = screen.getByPlaceholderText('https://open.spotify.com/artist/...');
      fireEvent.change(input, { target: { value: 'https://open.spotify.com/artist/abc123' } });
      fireEvent.click(getSubmitButton());

      await waitFor(() => {
        const link = screen.getByText('Check out Test Artist').closest('a');
        expect(link).toHaveAttribute('href', '/artist/abc123');
      });
    });

    it('links "Add links" to /artist/{id}?opADM=1', async () => {
      mockAddArtist.mockResolvedValue({
        status: 'success',
        message: 'Done!',
        artistId: 'abc123',
        artistName: 'Test Artist',
      });

      render(<AddArtist />);
      fireEvent.click(screen.getByRole('button'));

      const input = screen.getByPlaceholderText('https://open.spotify.com/artist/...');
      fireEvent.change(input, { target: { value: 'https://open.spotify.com/artist/abc123' } });
      fireEvent.click(getSubmitButton());

      await waitFor(() => {
        const link = screen.getByText('Add links for Test Artist').closest('a');
        expect(link).toHaveAttribute('href', '/artist/abc123?opADM=1');
      });
    });
  });
});
