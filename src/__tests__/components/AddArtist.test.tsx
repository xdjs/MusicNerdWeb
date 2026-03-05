// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

let mockSession = null;
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: mockSession }),
}));

const mockLogin = jest.fn();
jest.mock('@privy-io/react-auth', () => ({
  useLogin: () => ({ login: mockLogin }),
}));

const mockAddArtist = jest.fn();
jest.mock('@/app/actions/addArtist', () => ({
  addArtist: (...args) => mockAddArtist(...args),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogDescription: ({ children }) => <p>{children}</p>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant, size, ...rest }) => (
    <button onClick={onClick} className={className} data-variant={variant} {...rest}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ placeholder, ...rest }) => <input placeholder={placeholder} {...rest} />,
}));

jest.mock('@/components/ui/form', () => jest.requireActual('@/components/ui/form'));

jest.mock('next/link', () =>
  function MockLink({ children, href, ...rest }) {
    return <a href={href} {...rest}>{children}</a>;
  }
);

jest.mock('lucide-react', () => ({
  Plus: () => <svg data-testid="plus-icon" />,
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}));

import AddArtist from '@/app/_components/nav/components/AddArtist';

function getSubmitButton() {
  return screen.getAllByRole('button').find(
    (btn) => btn.textContent?.trim() === 'Add Artist'
  );
}

describe('AddArtist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession = null;
  });

  it('renders the + button', () => {
    render(<AddArtist />);
    expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
  });

  it('calls Privy login() when clicked without a session', () => {
    render(<AddArtist />);
    fireEvent.click(screen.getByTestId('plus-icon').closest('button'));
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it('opens the dialog when clicked with an active session', () => {
    mockSession = { user: { id: 'user-1' } };
    render(<AddArtist />);
    fireEvent.click(screen.getByTestId('plus-icon').closest('button'));
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Add Artist');
  });

  it('shows the Spotify URL input inside the dialog', () => {
    mockSession = { user: { id: 'user-1' } };
    render(<AddArtist />);
    fireEvent.click(screen.getByTestId('plus-icon').closest('button'));
    expect(screen.getByPlaceholderText('https://open.spotify.com/artist/...')).toBeInTheDocument();
  });

  it('submits a valid Spotify URL and calls addArtist', async () => {
    mockSession = { user: { id: 'user-1' } };
    mockAddArtist.mockResolvedValue({ status: 'success', message: 'Added!', artistId: 'new-id', artistName: 'New Artist' });
    render(<AddArtist />);
    fireEvent.click(screen.getByTestId('plus-icon').closest('button'));
    fireEvent.change(
      screen.getByPlaceholderText('https://open.spotify.com/artist/...'),
      { target: { value: 'https://open.spotify.com/artist/abc123' } }
    );
    fireEvent.click(getSubmitButton());
    await waitFor(() => { expect(mockAddArtist).toHaveBeenCalledWith('abc123'); });
  });

  it('shows success message after adding artist', async () => {
    mockSession = { user: { id: 'user-1' } };
    mockAddArtist.mockResolvedValue({ status: 'success', message: 'Artist added successfully!', artistId: 'new-id', artistName: 'New Artist' });
    render(<AddArtist />);
    fireEvent.click(screen.getByTestId('plus-icon').closest('button'));
    fireEvent.change(
      screen.getByPlaceholderText('https://open.spotify.com/artist/...'),
      { target: { value: 'https://open.spotify.com/artist/abc123' } }
    );
    fireEvent.click(getSubmitButton());
    await waitFor(() => { expect(screen.getByText('Artist added successfully!')).toBeInTheDocument(); });
  });

  it('shows links to check out / add links after a successful add', async () => {
    mockSession = { user: { id: 'user-1' } };
    mockAddArtist.mockResolvedValue({ status: 'success', message: 'OK', artistId: 'new-id', artistName: 'New Artist' });
    render(<AddArtist />);
    fireEvent.click(screen.getByTestId('plus-icon').closest('button'));
    fireEvent.change(
      screen.getByPlaceholderText('https://open.spotify.com/artist/...'),
      { target: { value: 'https://open.spotify.com/artist/abc123' } }
    );
    fireEvent.click(getSubmitButton());
    await waitFor(() => {
      expect(screen.getByText('Check out New Artist')).toBeInTheDocument();
      expect(screen.getByText('Add links for New Artist')).toBeInTheDocument();
    });
  });

  it('shows error message on failure', async () => {
    mockSession = { user: { id: 'user-1' } };
    mockAddArtist.mockResolvedValue({ status: 'error', message: 'Failed to add artist.' });
    render(<AddArtist />);
    fireEvent.click(screen.getByTestId('plus-icon').closest('button'));
    fireEvent.change(
      screen.getByPlaceholderText('https://open.spotify.com/artist/...'),
      { target: { value: 'https://open.spotify.com/artist/abc123' } }
    );
    fireEvent.click(getSubmitButton());
    await waitFor(() => { expect(screen.getByText('Failed to add artist.')).toBeInTheDocument(); });
  });
});
