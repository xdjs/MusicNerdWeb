import { canonicalizeDestinationUrl } from '@/lib/links/canonicalizeDestinationUrl';
import { getSourceLinks } from '../getSourceLinks';
const site = (id: string, url: string) => ({id, url, type:'website', status:'approved'});
it('deduplicates serialized website variants while retaining the original href and source identity', () => {
 const first=site('first','https://THEELLISCOURT.com');
 expect(getSourceLinks([first,site('second','https://theelliscourt.com:443/')])).toEqual([
  expect.objectContaining({sourceId:'first',href:first.url,iconSrc:'/siteIcons/website_icon.svg'})
 ]);
});
it('deduplicates equivalent source websites against direct destinations', () => {
 expect(getSourceLinks([site('source','https://theelliscourt.com/')],[{siteName:'website',href:'https://THEELLISCOURT.com',label:'Website',iconSrc:''}])).toEqual([]);
});
it('preserves distinct paths, query destinations, hostnames and schemes', () => {
 const urls=['https://theelliscourt.com/#/music','https://theelliscourt.com/#/store','https://theelliscourt.com/News','https://theelliscourt.com/news','https://theelliscourt.com/news/','https://theelliscourt.com/?page=1','https://theelliscourt.com/?page=2','https://www.theelliscourt.com/','http://theelliscourt.com/'];
 expect(new Set(urls.map(url => canonicalizeDestinationUrl(url))).size).toBe(urls.length);
});
it('preserves placement, approval and editorial rules independently of deduplication', () => {
 const records=[site('web','https://theelliscourt.com'),site('support','https://theelliscourt.bandcamp.com'),{...site('press','https://example.com/review'),type:'article'},{...site('pending','https://pending.example.com'),status:'pending'},{...site('rejected','https://rejected.example.com'),status:'rejected'}];
 expect(getSourceLinks(records).map(x=>x.sourceId)).toEqual(['web']);
 expect(getSourceLinks(records,[],'support').map(x=>x.sourceId)).toEqual(['support']);
});

it('keeps only the recorded homepage in Links without merging source identities', () => {
 const home=site('home','https://theelliscourt.com/');
 const bio=site('bio','https://theelliscourt.com/whats-the-ellis-court-2/');
 expect(getSourceLinks([home,bio])).toEqual([
  expect.objectContaining({sourceId:'home',href:home.url,label:'theelliscourt.com'}),
 ]);
});

it('does not promote a supporting page when its main destination is hidden',()=>{
 const home=site('home','https://artist.example/'),bio=site('bio','https://artist.example/about');
 expect(getSourceLinks([bio],[],'links',[home,bio])).toEqual([]);
});
