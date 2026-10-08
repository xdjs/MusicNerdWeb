import { useEffect } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import GuidedBuildStart from '../GuidedBuildStart';

it('does not mount actual onboarding or its effects before Start', () => {
  const start = jest.fn();
  function ActualFlow() { useEffect(start, []); return <div>Actual onboarding</div>; }
  render(<GuidedBuildStart artistName="LATASHÁ"><ActualFlow/></GuidedBuildStart>);
  expect(start).not.toHaveBeenCalled();
  expect(screen.queryByText('Actual onboarding')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Start profile build' }));
  expect(start).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Actual onboarding')).toBeInTheDocument();
});
