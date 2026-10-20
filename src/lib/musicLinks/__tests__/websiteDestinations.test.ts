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
 expect(getSourceLinks(urls.map((url,i)=>site(String(i),url)))).toHaveLength(urls.length);
});
it('preserves placement, approval and editorial rules independently of deduplication', () => {
 const records=[site('web','https://theelliscourt.com'),site('support','https://theelliscourt.bandcamp.com'),{...site('press','https://example.com/review'),type:'article'},{...site('pending','https://pending.example.com'),status:'pending'},{...site('rejected','https://rejected.example.com'),status:'rejected'}];
 expect(getSourceLinks(records).map(x=>x.sourceId)).toEqual(['web']);
 expect(getSourceLinks(records,[],'support').map(x=>x.sourceId)).toEqual(['support']);
});
