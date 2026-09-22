import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LiveUserProfile from '../LiveUserProfile';
import type { LiveProfileModel } from '@/lib/profile/types';
let mockAccount='a';
let mockModel: LiveProfileModel;
jest.mock('next-auth/react',()=>({useSession:()=>({status:'authenticated',data:{user:{id:mockAccount}},update:jest.fn()})}));
jest.mock('../ProfileConcept',()=>({__esModule:true,default:({live}:{live:LiveProfileModel})=>{mockModel=live;return <div data-testid="artists">{live.artists.map(a=>a.artistName).join(',')}</div>}}));
jest.mock('../ProfileLoading',()=>({__esModule:true,default:()=> <div>Loading account</div>}));
const user=(id:string)=>({id,username:id,email:null,wallet:null,isAdmin:false,isWhiteListed:false,isHidden:false});
let client:QueryClient;
beforeEach(()=>{
 mockAccount='a';client=new QueryClient({defaultOptions:{queries:{retry:false}}});
 jest.spyOn(global,'fetch').mockImplementation(async(url,init)=>{
 const account=(init?.headers as Record<string,string>)['X-Profile-Account'];const path=String(url);let body;
 if(path.includes('/summary'))body={entries:[],approved:1,pending:0,totalContributions:1,selfEdits:0,artistsAdded:0};
 else if(path.includes('/profile-image'))body={url:null};
 else if(path.includes('/updates'))body={items:[],next:null,checked:1,unavailable:false};
 else {const search=new URL(path,'https://test').searchParams.get('q');body={artists:[{artistId:account,artistName:search?`${account} search`:`${account} artist`,imageUrl:null}],total:1,next:null};}
 return {ok:true,json:async()=>({userId:account,...body})} as Response;
 });
});
afterEach(()=>{client.clear();jest.restoreAllMocks()});
const tree=(id:string)=><QueryClientProvider client={client}><LiveUserProfile key={id} user={user(id)}/></QueryClientProvider>;
it('loads both sections without reading or importing bookmarks and searches remotely',async()=>{
 render(tree('a'));await waitFor(()=>expect(screen.getByTestId('artists')).toHaveTextContent('a artist'));
 await waitFor(()=>expect(global.fetch).toHaveBeenCalledWith('/api/profile/updates?offset=0&kind=All',expect.objectContaining({headers:{'X-Profile-Account':'a'}})));
 await act(async()=>mockModel.setArtistSearch('beyond first page'));
 await waitFor(()=>expect(mockModel.artistMatches[0]?.artistName).toBe('a search'));
 expect(mockModel.artists[0]?.artistName).toBe('a artist');
 expect(jest.mocked(global.fetch).mock.calls.some(([url])=>String(url).includes('bookmarks'))).toBe(false);
});
it('hides the previous account immediately and fetches the next account separately',async()=>{
 const {rerender}=render(tree('a'));await waitFor(()=>expect(screen.getByTestId('artists')).toHaveTextContent('a artist'));
 mockAccount='b';rerender(tree('a'));expect(screen.queryByTestId('artists')).not.toBeInTheDocument();
 rerender(tree('b'));await waitFor(()=>expect(screen.getByTestId('artists')).toHaveTextContent('b artist'));
 expect(screen.getByTestId('artists')).not.toHaveTextContent('a artist');
});
