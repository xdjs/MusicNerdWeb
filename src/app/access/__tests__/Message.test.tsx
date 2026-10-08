import { render, screen } from '@testing-library/react';
import Message from '../Message';

it('centres its content in the space between header and footer', () => {
  render(<Message><p>Loading…</p></Message>);
  expect(screen.getByText('Loading…').parentElement).toHaveClass('flex-1', 'flex', 'items-center', 'justify-center');
});
