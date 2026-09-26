import {render, screen, fireEvent, waitFor, within} from '@testing-library/react';
import UGCDataTable from '../ugc-data-table';
import {ugcColumns} from '../columns';
import {approveUgcAdminAction} from '@/app/actions/serverActions';
import {useRouter} from 'next/navigation';

jest.mock('@/app/actions/serverActions',()=>({approveUgcAdminAction:jest.fn()}));
jest.mock('next/navigation',()=>({useRouter:jest.fn()}));
jest.mock('../WhitelistUserEditDialog',()=>()=>null);
const refresh=jest.fn();
const submission=(id:string,name:string)=>({id,name,artistId:`artist-${id}`,artistUri:null,userId:null,accepted:false,ugcUrl:'https://example.com',siteName:'Website',siteUsername:null,createdAt:null,updatedAt:null,dateProcessed:null});
const data=[submission('one','First artist'),submission('two','Second artist')];
beforeEach(()=>{
 jest.clearAllMocks();
 jest.mocked(approveUgcAdminAction).mockReset();
 jest.mocked(useRouter).mockReturnValue({refresh} as unknown as ReturnType<typeof useRouter>);
 jest.mocked(approveUgcAdminAction).mockResolvedValue({status:'success',message:'UGC approved'});
});
it('approves just the clicked row with no selection and removes it after success',async()=>{
 render(<UGCDataTable columns={ugcColumns} data={data}/>);
 fireEvent.click(screen.getByRole('button',{name:'Approve First artist submission'}));
 await waitFor(()=>expect(approveUgcAdminAction).toHaveBeenCalledWith(['one']));
 expect(await screen.findByRole('status')).toHaveTextContent('Submission approved.');
 expect(screen.queryByRole('link',{name:'First artist'})).not.toBeInTheDocument();
 expect(screen.getByRole('link',{name:'Second artist'})).toBeInTheDocument();
 expect(refresh).toHaveBeenCalledTimes(1);
});
it('retains selection by submission ID when a different row is approved',async()=>{
 const {rerender}=render(<UGCDataTable columns={ugcColumns} data={data}/>);
 const row=screen.getByRole('link',{name:'Second artist'}).closest('tr')!;
 fireEvent.click(within(row).getByRole('checkbox'));
 fireEvent.click(screen.getByRole('button',{name:'Approve First artist submission'}));
 await screen.findByText('Submission approved.');
 rerender(<UGCDataTable columns={ugcColumns} data={[data[1]!]} />);
 fireEvent.click(screen.getByRole('button',{name:'Approve selected (1)'}));
 await waitFor(()=>expect(approveUgcAdminAction).toHaveBeenLastCalledWith(['two']));
});
it('prevents duplicate and bulk approvals during a row request',async()=>{
 let finish!:(value:{status:string,message:string})=>void;
 jest.mocked(approveUgcAdminAction).mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 render(<UGCDataTable columns={ugcColumns} data={data}/>);
 fireEvent.click(screen.getByRole('checkbox',{name:'Select all'}));
 const button=screen.getByRole('button',{name:'Approve First artist submission'});
 fireEvent.click(button); fireEvent.click(button);
 expect(button).toBeDisabled();
 expect(screen.getByRole('button',{name:'Approve selected (2)'})).toBeDisabled();
 expect(approveUgcAdminAction).toHaveBeenCalledTimes(1);
 finish({status:'success',message:'UGC approved'});
 await screen.findByText('Submission approved.');
});
it('keeps a failed submission and allows retry after a thrown error',async()=>{
 jest.mocked(approveUgcAdminAction).mockRejectedValueOnce(new Error('Network error'));
 render(<UGCDataTable columns={ugcColumns} data={data}/>);
 fireEvent.click(screen.getByRole('button',{name:'Approve First artist submission'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Approval couldn’t be confirmed.');
 expect(screen.getByRole('link',{name:'First artist'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Approve First artist submission'}));
 await screen.findByText('Submission approved.');
 expect(approveUgcAdminAction).toHaveBeenCalledTimes(2);
});
it('refreshes partial bulk failures without claiming every submission succeeded',async()=>{
 jest.mocked(approveUgcAdminAction).mockResolvedValueOnce({status:'error',message:'Approved 1 of 2 UGC items. Failed: two'});
 render(<UGCDataTable columns={ugcColumns} data={data}/>);
 fireEvent.click(screen.getByRole('checkbox',{name:'Select all'}));
 fireEvent.click(screen.getByRole('button',{name:'Approve selected (2)'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Approved 1 of 2');
 expect(screen.queryByRole('status')).not.toBeInTheDocument();
 expect(refresh).toHaveBeenCalled();
});
