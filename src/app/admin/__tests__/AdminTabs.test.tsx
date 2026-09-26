import {render, screen, fireEvent} from '@testing-library/react';
import AdminTabs from '../AdminTabs';

it('keeps all six tools reachable and opens the matching review queue from its summary', () => {
  render(<AdminTabs ugcCount={3} claimsCount={2} ugcContent={<p>Submitted links table</p>} claimsContent={<p>Ownership requests</p>} usersContent={<p>User controls</p>} artistDataContent={<p>Coverage data</p>} mcpKeysContent={<p>Key controls</p>} agentWorkContent={<p>Worker controls</p>}/>);
  expect(screen.getAllByRole('tab')).toHaveLength(6);
  expect(screen.getByText('Submitted links table')).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Review 2 pending claims'}));
  expect(screen.getByText('Ownership requests')).toBeVisible();
  expect(screen.queryByText('Submitted links table')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Review 3 pending links'}));
  expect(screen.getByText('Submitted links table')).toBeVisible();
  for (const [name,content] of [['People','User controls'],['Artist data','Coverage data'],['MCP keys','Key controls'],['Agent work','Worker controls']]) {
    fireEvent.mouseDown(screen.getByRole('tab',{name}),{button:0,ctrlKey:false});
    expect(screen.getByText(content)).toBeVisible();
  }
});
