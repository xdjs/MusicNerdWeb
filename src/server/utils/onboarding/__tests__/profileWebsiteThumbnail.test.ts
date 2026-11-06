import { applyProfileLinkDecisions } from '../applyProfileLinkDecisions';
import { fetchLinkPreview } from '@/server/utils/linkPreview';
import { insertVaultSource } from '@/server/utils/queries/dashboardQueries';

jest.mock('@/server/utils/queries/artistQueries', () => ({ getArtistById: jest.fn().mockResolvedValue({name:'Fixture Artist'}) }));
jest.mock('@/server/utils/queries/dashboardQueries', () => ({ getVaultSourcesByArtistId: jest.fn().mockResolvedValue([]), insertVaultSource: jest.fn().mockResolvedValue({id:'source'}), updateVaultSourceContent: jest.fn() }));
jest.mock('@/server/utils/linkPreview', () => ({fetchLinkPreview:jest.fn()}));
jest.mock('@/server/utils/services', () => ({extractArtistId:jest.fn().mockResolvedValue(undefined)}));
jest.mock('@/server/utils/artistLinkService', () => ({setArtistLink:jest.fn(),clearArtistLink:jest.fn()}));
jest.mock('@/server/utils/artistIdentityGuards', () => ({}));
jest.mock('@/server/utils/profileDiscovery', () => ({titleMatchesArtist:(title:string)=>title.includes('Fixture Artist')}));

beforeEach(()=>jest.clearAllMocks());
it.each(['https://example.org/photo.jpg', null])('preserves fetched thumbnail %s on an owned supporting page', async imageUrl=>{
 jest.mocked(fetchLinkPreview).mockResolvedValue({title:'Fixture Artist biography',imageUrl});
 const result=await applyProfileLinkDecisions('artist',[{url:'https://example.org/about'}],[]);
 expect(insertVaultSource).toHaveBeenCalledWith(expect.objectContaining({url:'https://example.org/about',ogImage:imageUrl,type:'website',status:'approved'}));
 expect(result.routedToVaultApproved).toEqual(['https://example.org/about']);
 expect(fetchLinkPreview).toHaveBeenCalledTimes(1);
});
it('preserves pending moderation while retaining image metadata',async()=>{
 jest.mocked(fetchLinkPreview).mockResolvedValue({title:'An interview',imageUrl:'https://example.org/photo.jpg'});
 await applyProfileLinkDecisions('artist',[{url:'https://example.org/interview'}],[]);
 expect(insertVaultSource).toHaveBeenCalledWith(expect.objectContaining({ogImage:'https://example.org/photo.jpg',status:'pending'}));
});
it('rejects unsafe source URLs before fetching metadata or writing',async()=>{
 await applyProfileLinkDecisions('artist',[{url:'http://127.0.0.1/about'}],[]);
 expect(fetchLinkPreview).not.toHaveBeenCalled();
 expect(insertVaultSource).not.toHaveBeenCalled();
});
