import { isMainWebsiteSource } from '../isMainWebsiteSource';
const site=(url:string,status='approved')=>({url,type:'website',status});
it('routes the recorded biography to Lore while preserving the homepage',()=>{
 const home=site('https://theelliscourt.com/'),bio=site('https://theelliscourt.com/whats-the-ellis-court-2/');
 expect(isMainWebsiteSource(home,[bio,home])).toBe(true);
 expect(isMainWebsiteSource(bio,[bio,home])).toBe(false);
});
it('preserves hosted artist homepages and routes only their descendants',()=>{
 const home=site('https://host.example/artists/alice/');
 expect(isMainWebsiteSource(home,[home])).toBe(true);
 expect(isMainWebsiteSource(site('https://host.example/artists/alice/story'),[home])).toBe(false);
 expect(isMainWebsiteSource(site('https://host.example/artists/alice2/'),[home])).toBe(true);
});
it('does not let pending or rejected roots change approved page routing',()=>{
 const home=site('https://host.example/artists/alice/');
 for(const status of ['pending','rejected']) expect(isMainWebsiteSource(home,[site('https://host.example/',status)])).toBe(true);
});
it('does not guess a standalone hosted homepage role from its path',()=>{
 for(const path of ['about','bio','artists/alice']) expect(isMainWebsiteSource(site('https://host.example/'+path))).toBe(true);
});
it('keeps URL equivalence separate from routing and never matches a different origin',()=>{
 const home=site('https://EXAMPLE.com:443/');
 expect(isMainWebsiteSource(site('https://example.com'),[home])).toBe(true);
 expect(isMainWebsiteSource(site('https://elsewhere.example/story'),[home])).toBe(true);
 expect(isMainWebsiteSource(site('https://example.com.evil/story'),[home])).toBe(true);
 expect(isMainWebsiteSource(site('not a url'),[home])).toBe(false);
});

it('does not use query-hosted destinations as an ancestor for other tenants',()=>{
 expect(isMainWebsiteSource(site('https://host.example/?artist=b'),[site('https://host.example/?artist=a')])).toBe(true);
});

it('never uses a podcast source as a website anchor',()=>{
 const episode={...site('https://host.example/'),podcastEpisodeKey:'episode'};
 expect(isMainWebsiteSource(site('https://host.example/artist'),[episode])).toBe(true);
});
