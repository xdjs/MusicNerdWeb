import { render, screen } from '@testing-library/react';
import Page, { metadata } from '../page';

it('is an indexable page titled Terms of Service', () => {
  expect(metadata.title).toBe('Terms of Service');
  expect(metadata.robots).toBeUndefined();
});

it('names the operator, the contact and the Privacy Policy', () => {
  render(<Page />);
  expect(screen.getByRole('heading', { level: 1, name: 'Terms of Service' })).toBeInTheDocument();
  expect(screen.getAllByText(/xDJs/).length).toBeGreaterThan(0);
  expect(screen.getByRole('link', { name: 'dev@xdjs.com' })).toHaveAttribute('href', 'mailto:dev@xdjs.com');
  expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
});
