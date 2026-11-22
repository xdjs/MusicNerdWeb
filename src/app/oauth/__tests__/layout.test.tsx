import { render, screen } from '@testing-library/react';
import OAuthLayout from '../layout';

it('renders the page over a decorative backdrop', () => {
  const { container } = render(<OAuthLayout><p>page</p></OAuthLayout>);
  expect(screen.getByText('page')).toBeInTheDocument();
  expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
});
