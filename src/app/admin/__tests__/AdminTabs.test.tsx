import {render,screen,fireEvent} from '@testing-library/react';
import AdminTabs from '../AdminTabs';
const push=jest.fn();
jest.mock('next/navigation',()=>({useRouter:()=>({push})}));
const props={ugcCount:2,loreCount:3,correctionsCount:1,claimsCount:2,reviewContent:<p>Unified review list</p>,claimsContent:<p>Ownership requests</p>,usersContent:<p>User controls</p>,artistDataContent:<p>Coverage data</p>,mcpKeysContent:<p>Key controls</p>,agentWorkContent:<p>Worker controls</p>};
beforeEach(()=>push.mockClear());
it('uses one combined review tab among seven tools and keeps other tools reachable',()=>{
 render(<AdminTabs {...props}/>);
 expect(screen.getAllByRole('tab')).toHaveLength(7);
 expect(screen.getByRole('tab',{name:'Lore review 6'})).toHaveAttribute('data-state','active');
 expect(screen.getByText('Unified review list')).toBeVisible();
 expect(screen.queryByRole('tab',{name:/Link submissions|About corrections/})).not.toBeInTheDocument();
 for(const [name,content] of [['People','User controls'],['Artist data','Coverage data'],['MCP keys','Key controls'],['Agent work','Worker controls']]){
  fireEvent.mouseDown(screen.getByRole('tab',{name}),{button:0,ctrlKey:false});
  expect(screen.getByText(content)).toBeVisible();
 }
});
it('routes summary cards to the corresponding filter in the unified review list',()=>{
 render(<AdminTabs {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'Review 2 pending claims'}));
 expect(screen.getByText('Ownership requests')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Review 3 pending Lore sources'}));
 expect(push).toHaveBeenLastCalledWith('/admin?section=lore&reviewType=sources');
 expect(screen.getByRole('tab',{name:'Lore review 6'})).toHaveAttribute('data-state','active');
 expect(screen.getByText('Unified review list')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Review 2 pending links'}));
 expect(push).toHaveBeenLastCalledWith('/admin?section=lore&reviewType=links');
});
it.each(['ugc','corrections'] as const)('maps legacy %s section to unified review',initialSection=>{
 render(<AdminTabs {...props} initialSection={initialSection}/>);
 expect(screen.getByRole('tab',{name:'Lore review 6'})).toHaveAttribute('data-state','active');
 expect(screen.getByText('Unified review list')).toBeVisible();
});
it('updates the combined badge after the server refreshes counts',()=>{
 const {rerender}=render(<AdminTabs {...props}/>);
 rerender(<AdminTabs {...props} correctionsCount={0}/>);
 expect(screen.getByRole('tab',{name:'Lore review 5'})).toHaveAttribute('data-state','active');
});
