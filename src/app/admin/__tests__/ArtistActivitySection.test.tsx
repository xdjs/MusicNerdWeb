import { render, screen } from '@testing-library/react';
import ArtistActivitySection from '../ArtistActivitySection';
const item = { id:'event',artistId:'artist',artistName:'Demo artist',action:'source_search',trigger:'claim_approval',actorKind:'user',actorId:'account',actorName:'Pete Rango',actorEmail:null,createdAt:'2026-10-12T00:00:00Z',sourceId:null };
const data = {items:[item],total:1,page:1,pageSize:25,query:'',action:'',eventId:''};
it('identifies claim approver rather than implying manual research request',()=>{
 render(<ArtistActivitySection data={data} />);
 expect(screen.getByText('Claim approved by Pete Rango')).toBeInTheDocument();
 expect(screen.getByText('Research reason: Claim approved')).toBeInTheDocument();
 expect(screen.queryByText('Research requested by Pete Rango')).not.toBeInTheDocument();
 expect(screen.getByRole('link',{name:'More activity by this account'})).toHaveAttribute('href','/admin?section=activity&activityQuery=account');
 expect(screen.getByText('10/12/2026, 12:00:00 AM UTC')).toHaveAttribute('datetime',item.createdAt);
});
it('identifies the same account as requester for manual research',()=>{
 render(<ArtistActivitySection data={{...data,items:[{...item,trigger:'editor_search'}]}} />);
 expect(screen.getByText('Research requested by Pete Rango')).toBeInTheDocument();
 expect(screen.getByText('Research reason: Search web for sources')).toBeInTheDocument();
});
it('does not infer a claim approver from unknown legacy activity',()=>{
 render(<ArtistActivitySection data={{...data,items:[{...item,trigger:'unrecorded',actorKind:'unknown',actorId:null,actorName:null}]}} />);
 expect(screen.getByText('Recorded account: Unknown initiator')).toBeInTheDocument();
 expect(screen.queryByText(/Claim approved by/)).not.toBeInTheDocument();
});
