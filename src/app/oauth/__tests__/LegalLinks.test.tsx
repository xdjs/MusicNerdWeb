import { render, screen } from '@testing-library/react';
import LegalLinks from '../LegalLinks';

it('links the Terms and Privacy pages', () => {
  render(<LegalLinks />);
  expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
  expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
});
