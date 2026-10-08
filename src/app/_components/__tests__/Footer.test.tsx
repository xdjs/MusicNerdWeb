import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import Footer from '../Footer';

jest.mock('next/navigation', () => ({ usePathname: jest.fn() }));

it.each(['/', '/artist/abc'])('shows the footer links on %s', (path) => {
  (usePathname as jest.Mock).mockReturnValue(path);
  render(<Footer />);
  expect(screen.getByRole('navigation', { name: 'Footer' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
});
