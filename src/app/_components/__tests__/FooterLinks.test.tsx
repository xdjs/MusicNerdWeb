import { render, screen } from '@testing-library/react';
import FooterLinks from '../FooterLinks';

it('links to About, the API docs, Terms and Privacy', () => {
  render(<FooterLinks />);
  expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
  const docs = screen.getByRole('link', { name: 'Docs' });
  expect(docs).toHaveAttribute('href', 'https://docs.musicnerd.net');
  expect(docs).toHaveAttribute('target', '_blank');
  expect(docs).toHaveAttribute('rel', 'noopener noreferrer');
  expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
  expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
});

it('is a labelled navigation landmark', () => {
  render(<FooterLinks />);
  expect(screen.getByRole('navigation', { name: 'Footer' })).toBeInTheDocument();
});
