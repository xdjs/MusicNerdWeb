import { render, screen } from '@testing-library/react';
import LegalPage from '../LegalPage';

it('titles the page and states when it took effect', () => {
  render(<LegalPage title="Privacy Policy"><p>Body</p></LegalPage>);
  expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
  const date = screen.getByText('October 8, 2026');
  expect(date.tagName).toBe('TIME');
  expect(date).toHaveAttribute('dateTime', '2026-10-08');
  expect(screen.getByText('Body')).toBeInTheDocument();
});
