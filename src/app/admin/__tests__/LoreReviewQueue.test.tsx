import {useState} from 'react';
import {render, screen, fireEvent, within} from '@testing-library/react';
import LoreReviewQueue from '../LoreReviewQueue';

it('keeps each contribution type’s own review action and filters only the matching panel', () => {
  const approveLink = jest.fn();
  const rejectSource = jest.fn();
  const resolveCorrection = jest.fn();
  function ReviewHarness() {
    const [value, setValue] = useState('all');
    return <LoreReviewQueue value={value} onValueChange={setValue}
      linksCount={2} sourcesCount={3} correctionsCount={1}
      linksContent={<button onClick={approveLink}>Approve link</button>}
      sourcesContent={<button onClick={rejectSource}>Reject source</button>}
      correctionsContent={<button onClick={resolveCorrection}>Resolve correction</button>}/>;
  }
  render(<ReviewHarness/>);
  fireEvent.click(within(screen.getByRole('region', {name: 'Links review'})).getByRole('button', {name: 'Approve link'}));
  fireEvent.click(within(screen.getByRole('region', {name: 'Lore sources review'})).getByRole('button', {name: 'Reject source'}));
  fireEvent.click(within(screen.getByRole('region', {name: 'About corrections review'})).getByRole('button', {name: 'Resolve correction'}));
  expect(approveLink).toHaveBeenCalledTimes(1);
  expect(rejectSource).toHaveBeenCalledTimes(1);
  expect(resolveCorrection).toHaveBeenCalledTimes(1);

  for (const [option, region] of [['Links (2)', 'Links review'], ['Lore sources (3)', 'Lore sources review'], ['About corrections (1)', 'About corrections review']]) {
    fireEvent.keyDown(screen.getByRole('combobox', {name: 'Review type'}), {key: 'ArrowDown'});
    fireEvent.click(screen.getByRole('option', {name: option}));
    expect(screen.getAllByRole('region')).toHaveLength(1);
    expect(screen.getByRole('region', {name: region})).toBeVisible();
  }
  // Changing the queue view never performs a review action itself.
  expect(approveLink).toHaveBeenCalledTimes(1);
  expect(rejectSource).toHaveBeenCalledTimes(1);
  expect(resolveCorrection).toHaveBeenCalledTimes(1);
});
