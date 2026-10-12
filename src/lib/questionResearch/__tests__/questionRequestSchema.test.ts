import { questionRequestSchema } from '../questionRequestSchema';
const input={artistId:'11111111-1111-4111-8111-111111111111',question:'Who filmed it?'};
it('accepts bounded public citation URLs',()=>{
 expect(questionRequestSchema.safeParse({...input,conversation:[{question:'Which post?',answer:'The rooftop film.',sourceUrls:['https://artist.example/post']}]}).success).toBe(true);
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
