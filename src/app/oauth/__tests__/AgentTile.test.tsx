import { render } from '@testing-library/react';
import AgentTile from '../AgentTile';

it('draws a decorative agent icon at the given size', () => {
  const { container } = render(<AgentTile className="h-12 w-12" />);
  expect(container.firstChild).toHaveClass('h-12', 'w-12');
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
});
