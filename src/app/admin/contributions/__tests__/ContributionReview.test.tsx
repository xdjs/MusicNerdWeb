import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContributionReview from '../ContributionReview';
import type { ContributionsPage } from '@/lib/admin/adminReadTypes';
const refresh = jest.fn();
const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push }) }));
jest.mock('@/hooks/useRefreshAdmin',()=>({useRefreshAdmin:()=>refresh}));
jest.mock('@/lib/admin/approveLinkSuggestion', () => ({ approveLinkSuggestion: jest.fn() }));
jest.mock('@/lib/source/reviewLoreSource', () => ({ reviewLoreSource: jest.fn() }));
const data: ContributionsPage = {
 account: null,
 items: [{ id:'source', type:'lore', origin:'research', artistId:'artist', artistName:'Demo artist', title:'Interview', url:'https://example.test', userId:'account', username:'Demo user', email:null, actorKind:'user', status:'pending', createdAt:'2026-09-28T10:00:00Z', trigger:'editor_search', activityId:'event' }],
 counts:{user:{total:40,pending:30},research:{total:10,pending:2},unknown:{total:5,pending:5}},total:26,page:1,pageSize:25,userId:'account',query:'demo',origin:'research',type:'',status:'pending',
};
it('shows full totals, preserves account in filters/pages and identifies research requester', () => {
 render(<ContributionReview data={data} />);
 expect(screen.getByLabelText('Contribution summary')).toHaveTextContent('55');
 expect(screen.getByLabelText('Contribution summary')).toHaveTextContent('37 awaiting review');
 expect(screen.getByText('Research requested by Demo user')).toBeInTheDocument();
 expect(screen.queryByText('Submitted by Demo user')).not.toBeInTheDocument();
 expect(screen.getByRole('link', {name:'Next'}).getAttribute('href')).toContain('userId=account');
 expect(screen.getByRole('link', {name:'Next'}).getAttribute('href')).toContain('origin=research');
 expect(screen.getByRole('link', {name:'Review pending user submissions'}).getAttribute('href')).toContain('origin=user');
 fireEvent.keyDown(screen.getByRole('combobox',{name:'Origin'}),{key:'ArrowDown'});
 expect(screen.getByRole('option', {name:'User submissions (40 total)'})).toBeInTheDocument();
});
it('reviews a single Lore source with pending-state protection and refreshes the counts', async () => {
 const onReviewLore = jest.fn().mockResolvedValue({success:true});
 render(<ContributionReview data={data} onReviewLore={onReviewLore} />);
 fireEvent.click(screen.getByRole('button', {name:'Approve Interview'}));
 await waitFor(() => expect(onReviewLore).toHaveBeenCalledWith(expect.any(String),'source','approved'));
 await waitFor(() => expect(refresh).toHaveBeenCalled());
});
it('does not offer review actions for completed submissions', () => {
 render(<ContributionReview data={{...data,items:[{...data.items[0],status:'approved'}]}} />);
 expect(screen.queryByRole('button', {name:'Approve Interview'})).not.toBeInTheDocument();
});

it('hides the user review shortcut when no user submissions are pending', () => {
 render(<ContributionReview data={{...data,counts:{...data.counts,user:{total:40,pending:0}}}} />);
 expect(screen.queryByRole('link',{name:'Review pending user submissions'})).not.toBeInTheDocument();
});

it.each([
 ['research', 'lore', 'claim_approval', 'Claim approved by Demo user'],
 ['research', 'lore', 'editor_search', 'Research requested by Demo user'],
 ['user', 'lore', 'visitor_suggestion', 'Submitted by Demo user'],
 ['user', 'upload', 'upload', 'Uploaded by Demo user'],
 ['unknown', 'lore', 'claim_approval', 'Recorded account: Demo user'],
] as const)('preserves contributor role for %s / %s / %s', (origin,type,trigger,label) => {
 render(<ContributionReview data={{...data,items:[{...data.items[0],origin,type,trigger}]}} />);
 expect(screen.getByText(label)).toBeInTheDocument();
 if(origin==='research' && trigger==='claim_approval') expect(screen.getByText('Research reason: Claim approved')).toBeInTheDocument();
});

it('approves a link suggestion on its artist and shows an API error', async () => {
 const onApproveLink = jest.fn().mockRejectedValue(new Error('A different account is already connected.'));
 render(<ContributionReview data={{...data,items:[{...data.items[0],id:'ugc',type:'link',title:'Instagram'}]}} onApproveLink={onApproveLink} />);
 fireEvent.click(screen.getByRole('button', {name:'Approve Instagram'}));
 await waitFor(() => expect(onApproveLink).toHaveBeenCalledWith('artist','ugc'));
 await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('A different account is already connected.'));
});
