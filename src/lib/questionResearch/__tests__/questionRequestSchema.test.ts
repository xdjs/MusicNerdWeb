import { questionRequestSchema } from '../questionRequestSchema';
const input={artistId:'11111111-1111-4111-8111-111111111111',question:'Who filmed it?'};
it('accepts bounded public citation URLs',()=>{
 expect(questionRequestSchema.safeParse({...input,conversation:[{question:'Which post?',answer:'The rooftop film.',sourceUrls:['https://artist.example/post']}]}).success).toBe(true);
});
it('accepts exact cited source numbers without deriving them from URL order',()=>{
 expect(questionRequestSchema.safeParse({...input,conversation:[{question:'What makes that introduction work?',answer:'The Spotify playlist [3] collects releases. The site playlist [4] is separate.',sourceUrls:['https://artist.example/site','https://interview.example/story'],sourceRefs:[{n:3,url:'https://interview.example/story'},{n:4,url:'https://artist.example/site'}]}]}).success).toBe(true);
});
it.each([
 [{n:3,url:'https://outside.example/story'}],
 [{n:3,url:'https://artist.example/story'},{n:3,url:'https://artist.example/story'}],
 [{n:0,url:'https://artist.example/story'}],
])('rejects citation references outside the cited-source contract %#',(...sourceRefs)=>{
 expect(questionRequestSchema.safeParse({...input,conversation:[{question:'Which source?',answer:'A cited answer [3].',sourceUrls:['https://artist.example/story'],sourceRefs}]}).success).toBe(false);
});
it.each([
 ['javascript:alert(1)'], ['file:///private/story'], Array(4).fill('https://artist.example/post'), ['https://artist.example/'+ 'x'.repeat(2048)]
])('rejects invalid or unbounded source URL arrays %#',sourceUrls=>{
 expect(questionRequestSchema.safeParse({...input,conversation:[{question:'q',answer:'a',sourceUrls}]}).success).toBe(false);
});
it('counts URL characters toward the complete context budget',()=>{
 const turn={question:'q'.repeat(500),answer:'a'.repeat(3000),sourceUrls:['https://artist.example/'+ 'x'.repeat(1000)]};
 expect(questionRequestSchema.safeParse({...input,conversation:[turn,turn,turn]}).success).toBe(false);
});
it('counts citation-reference overhead within the same complete context budget',()=>{
 const turn={question:'q'.repeat(500),answer:'a'.repeat(3000),sourceUrls:['https://artist.example/'+ 'x'.repeat(950)],sourceRefs:[{n:3,url:'https://artist.example/'+ 'x'.repeat(950)}]};
 expect(questionRequestSchema.safeParse({...input,conversation:[turn,turn,turn]}).success).toBe(false);
});
