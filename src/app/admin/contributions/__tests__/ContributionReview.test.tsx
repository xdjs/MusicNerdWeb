import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContributionReview from '../ContributionReview';
import type { getAdminContributions } from '@/server/utils/contributions/getAdminContributions';
const refresh = jest.fn();
const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push }) }));
jest.mock('@/app/actions/serverActions', () => ({ approveUgcAdminAction: jest.fn() }));
jest.mock('@/app/actions/dashboardActions', () => ({ updateSourceStatus: jest.fn() }));
const data: Awaited<ReturnType<typeof getAdminContributions>> = {
 items: [{ id:'source', type:'lore', origin:'research', artistId:'artist', artistName:'Demo artist', title:'Interview', url:'https://example.test', userId:'account', username:'Demo user', email:null, actorKind:'user', status:'pending', createdAt:'2026-09-28T10:00:00Z', trigger:'editor_search', activityId:'event' }],
 counts:{user:{total:40,pending:30},research:{total:10,pending:2},unknown:{total:5,pending:5}},total:26,page:1,pageSize:25,userId:'account',query:'demo',origin:'research',type:'',status:'pending',
};
it('shows full totals, preserves account in filters/pages and identifies research requester', () => {
 render(<ContributionReview data={data} />);
 expect(screen.getByRole('option', {name:'User submissions (40 total)'})).toBeInTheDocument();
 expect(screen.getByLabelText('Contribution summary')).toHaveTextContent('55');
 expect(screen.getByLabelText('Contribution summary')).toHaveTextContent('37 awaiting review');
 expect(screen.getByText('Research initiated by Demo user')).toBeInTheDocument();
 expect(screen.queryByText('Submitted by Demo user')).not.toBeInTheDocument();
 expect(screen.getByRole('link', {name:'Next'}).getAttribute('href')).toContain('userId=account');
 expect(screen.getByRole('link', {name:'Next'}).getAttribute('href')).toContain('origin=research');
 expect(screen.getByRole('link', {name:'Review pending user submissions'}).getAttribute('href')).toContain('origin=user');
});
it('reviews a single Lore source with pending-state protection and refreshes the counts', async () => {
 const onReviewLore = jest.fn().mockResolvedValue({success:true});
 render(<ContributionReview data={data} onReviewLore={onReviewLore} />);
 fireEvent.click(screen.getByRole('button', {name:'Approve Interview'}));
 await waitFor(() => expect(onReviewLore).toHaveBeenCalledWith('source','approved','pending'));
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
