import { render, screen } from '@testing-library/react';
import Page, { metadata } from '../page';

it('is an indexable page titled Privacy Policy', () => {
  expect(metadata.title).toBe('Privacy Policy');
  expect(metadata.robots).toBeUndefined();
});

it('names the operator, the contact and the Terms of Service', () => {
  render(<Page />);
  expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
  expect(screen.getAllByText(/xDJs/).length).toBeGreaterThan(0);
  const contacts = screen.getAllByRole('link', { name: 'dev@xdjs.com' });
  contacts.forEach(a => expect(a).toHaveAttribute('href', 'mailto:dev@xdjs.com'));
  expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
});

it('says analytics set no cookies, matching docs/analytics.md', () => {
  render(<Page />);
  expect(screen.getByText(/does not use cookies/)).toBeInTheDocument();
});
