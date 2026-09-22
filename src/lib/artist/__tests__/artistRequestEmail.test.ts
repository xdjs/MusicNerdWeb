import { artistRequestEmail } from '../artistRequestEmail';
it('prepares a review request with encoded artist name and public links',()=>{
 const draft=artistRequestEmail(' A & B ', 'https://artist.example/music?a=1&b=2\nhttps://artist.bandcamp.com');
 expect(draft.address).toBe('dev@xdjs.com');
 const url=new URL(draft.href);
 expect(url.protocol).toBe('mailto:');
 expect(url.searchParams.get('subject')).toBe('Music Nerd artist request: A & B');
 expect(url.searchParams.get('body')).toContain('https://artist.example/music?a=1&b=2');
 expect(draft.copyText).toContain(draft.address);
});
it('provides fill-in prompts when no details are entered',()=>{
 const draft=artistRequestEmail('','');
 expect(new URL(draft.href).searchParams.get('body')).toContain('[Artist name]');
 expect(draft.copyText).toContain('Bandcamp');
});
