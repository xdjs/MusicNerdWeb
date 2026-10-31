import {notFound} from 'next/navigation';
import Page from '../page';
jest.mock('next/navigation',()=>({notFound:jest.fn(()=>{throw new Error('not found')})}));
jest.mock('../EvidenceChatPreview',()=>({__esModule:true,default:()=>null}));
const prior=process.env.VERCEL_ENV;
afterEach(()=>{if(prior===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=prior;});
it('rejects production and permits preview without configuration changes',()=>{
 process.env.VERCEL_ENV='production';expect(()=>Page()).toThrow('not found');expect(notFound).toHaveBeenCalled();
 process.env.VERCEL_ENV='preview';expect(Page()).toBeTruthy();
});
