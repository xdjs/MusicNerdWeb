import {render, screen, fireEvent} from '@testing-library/react';
import AdminTabs from '../AdminTabs';

const props = {
  ugcCount: 2,
  loreCount: 3,
  correctionsCount: 1,
  claimsCount: 2,
  ugcContent: <p>Submitted links table</p>,
  loreContent: <p>Pending Lore sources</p>,
  correctionsContent: <p>Svaneborg correction report</p>,
  claimsContent: <p>Ownership requests</p>,
  usersContent: <p>User controls</p>,
  artistDataContent: <p>Coverage data</p>,
  mcpKeysContent: <p>Key controls</p>,
  agentWorkContent: <p>Worker controls</p>,
};

function selectReviewType(name: string) {
  fireEvent.keyDown(screen.getByRole('combobox', {name: 'Review type'}), {key: 'ArrowDown'});
  fireEvent.click(screen.getByRole('option', {name}));
}

it('consolidates review into one of seven sidebar tools and shows all review types by default', () => {
  render(<AdminTabs {...props}/>);
  expect(screen.getAllByRole('tab')).toHaveLength(7);
  expect(screen.getByRole('tab', {name: 'Lore review 6'})).toHaveAttribute('data-state', 'active');
  expect(screen.queryByRole('tab', {name: /Link submissions|About corrections/})).not.toBeInTheDocument();
  expect(screen.getByRole('combobox', {name: 'Review type'})).toHaveTextContent('All (6)');
  expect(screen.getByText('Submitted links table')).toBeVisible();
  expect(screen.getByText('Pending Lore sources')).toBeVisible();
  expect(screen.getByText('Svaneborg correction report')).toBeVisible();
  for (const [name,content] of [['People','User controls'],['Artist data','Coverage data'],['MCP keys','Key controls'],['Agent work','Worker controls']]) {
    fireEvent.mouseDown(screen.getByRole('tab',{name}),{button:0,ctrlKey:false});
    expect(screen.getByText(content)).toBeVisible();
  }
});

it('filters review types without leaving the combined Lore review tab', () => {
  render(<AdminTabs {...props}/>);
  selectReviewType('Links (2)');
  expect(screen.getByText('Submitted links table')).toBeVisible();
  expect(screen.queryByText('Pending Lore sources')).not.toBeInTheDocument();
  expect(screen.queryByText('Svaneborg correction report')).not.toBeInTheDocument();
  selectReviewType('Lore sources (3)');
  expect(screen.getByText('Pending Lore sources')).toBeVisible();
  expect(screen.queryByText('Submitted links table')).not.toBeInTheDocument();
  selectReviewType('About corrections (1)');
  expect(screen.getByText('Svaneborg correction report')).toBeVisible();
  expect(screen.queryByText('Pending Lore sources')).not.toBeInTheDocument();
  expect(screen.getByRole('tab', {name: 'Lore review 6'})).toHaveAttribute('data-state', 'active');
  selectReviewType('All (6)');
  expect(screen.getByText('Submitted links table')).toBeVisible();
  expect(screen.getByText('Pending Lore sources')).toBeVisible();
  expect(screen.getByText('Svaneborg correction report')).toBeVisible();
});

it('opens the corresponding review type from summary cards even after leaving review', () => {
  render(<AdminTabs {...props}/>);
  fireEvent.click(screen.getByRole('button',{name:'Review 2 pending claims'}));
  expect(screen.getByText('Ownership requests')).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Review 3 pending Lore sources'}));
  expect(screen.getByRole('tab', {name: 'Lore review 6'})).toHaveAttribute('data-state', 'active');
  expect(screen.getByRole('combobox', {name: 'Review type'})).toHaveTextContent('Lore sources (3)');
  expect(screen.getByText('Pending Lore sources')).toBeVisible();
  expect(screen.queryByText('Submitted links table')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Review 2 pending links'}));
  expect(screen.getByRole('combobox', {name: 'Review type'})).toHaveTextContent('Links (2)');
  expect(screen.getByText('Submitted links table')).toBeVisible();
  expect(screen.queryByText('Pending Lore sources')).not.toBeInTheDocument();
});

it('preserves old correction links and updates the combined count after review', () => {
  const {rerender}=render(<AdminTabs {...props} initialSection="corrections"/>);
  expect(screen.getByRole('tab',{name:'Lore review 6'})).toHaveAttribute('data-state','active');
  expect(screen.getByRole('combobox', {name: 'Review type'})).toHaveTextContent('About corrections (1)');
  expect(screen.getByText('Svaneborg correction report')).toBeVisible();
  expect(screen.queryByText('Pending Lore sources')).not.toBeInTheDocument();
  rerender(<AdminTabs {...props} initialSection="corrections" correctionsCount={0} correctionsContent={<p>No pending suggestions.</p>}/>);
  expect(screen.getByRole('tab',{name:'Lore review 5'})).toHaveAttribute('data-state','active');
  expect(screen.getByRole('combobox', {name: 'Review type'})).toHaveTextContent('About corrections (0)');
  expect(screen.getByText('No pending suggestions.')).toBeVisible();
});

it('preserves old link queue links', () => {
  render(<AdminTabs {...props} initialSection="ugc"/>);
  expect(screen.getByRole('tab',{name:'Lore review 6'})).toHaveAttribute('data-state','active');
  expect(screen.getByRole('combobox', {name: 'Review type'})).toHaveTextContent('Links (2)');
  expect(screen.getByText('Submitted links table')).toBeVisible();
  expect(screen.queryByText('Pending Lore sources')).not.toBeInTheDocument();
});

it('opens an explicit review type on the consolidated review route', () => {
  render(<AdminTabs {...props} initialSection="lore" initialReviewType="sources"/>);
  expect(screen.getByRole('combobox', {name: 'Review type'})).toHaveTextContent('Lore sources (3)');
  expect(screen.getByText('Pending Lore sources')).toBeVisible();
  expect(screen.queryByText('Submitted links table')).not.toBeInTheDocument();
});
