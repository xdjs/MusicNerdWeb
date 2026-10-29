import {render,screen} from '@testing-library/react';
import AdminDashboard from '../AdminDashboard';
jest.mock('next/navigation',()=>({useRouter:()=>({push:jest.fn()})}));
jest.mock('@/hooks/useRefreshAdmin',()=>({useRefreshAdmin:()=>jest.fn()}));
jest.mock('@/lib/admin/approveLinkSuggestion',()=>({approveLinkSuggestion:jest.fn()}));
jest.mock('@/lib/source/reviewLoreSource',()=>({reviewLoreSource:jest.fn()}));
const reviews={items:[],counts:{links:0,sources:0,corrections:0},pendingCounts:{links:2,sources:173,corrections:1},total:0,page:1,pageSize:25,type:'all' as const,query:'LATASHA'};
it('keeps global pending totals visible when the unified search has no matches',()=>{
 render(<AdminDashboard reviews={reviews} allUsers={[]} mcpKeys={[]} allClaims={[]}/>);
 expect(screen.getByRole('button',{name:'Review 173 pending Lore sources'})).toBeVisible();
 expect(screen.getByRole('button',{name:'Review 2 pending links'})).toBeVisible();
 expect(screen.getByRole('tab',{name:'Lore review 176'})).toBeVisible();
 expect(screen.getByRole('combobox',{name:'Review type'})).toHaveTextContent('All (0)');
 expect(screen.getByRole('status')).toHaveTextContent('0 pending items');
 expect(screen.getByText('No pending items match these filters.')).toBeVisible();
});
it('keeps one review destination without duplicate header links or type-specific tabs',()=>{
 render(<AdminDashboard reviews={{...reviews,type:'corrections'}} allUsers={[]} mcpKeys={[]} allClaims={[]} initialSection="corrections"/>);
 expect(screen.getByRole('tab',{name:'Lore review 176'})).toHaveAttribute('data-state','active');
 expect(screen.getByRole('combobox',{name:'Review type'})).toHaveTextContent('About corrections (0)');
 expect(screen.queryByRole('tab',{name:/About corrections|Link submissions/})).not.toBeInTheDocument();
 expect(screen.queryByRole('link',{name:'Review user submissions'})).not.toBeInTheDocument();
 expect(screen.queryByRole('link',{name:'Review About corrections'})).not.toBeInTheDocument();
});
