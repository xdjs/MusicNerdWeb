import { getQuestionRequestHash } from '../getQuestionRequestHash';
const turn = { question: 'Which record?', answer: 'OUT HERE', sourceUrls: ['https://example.com/a'] };
it('binds exact public context, artist and wording without semantic equivalence', () => {
 const key = getQuestionRequestHash('a', 'Who mixed it?', [turn]);
 expect(key).toMatch(/^[a-f0-9]{64}$/);
 expect(getQuestionRequestHash('a','Who mixed it?', [{...turn}])).toBe(key);
 for (const other of [getQuestionRequestHash('b','Who mixed it?',[turn]), getQuestionRequestHash('a','Who mixed it?',[]), getQuestionRequestHash('a','Who produced it?',[turn]),getQuestionRequestHash('a','Who mixed it?',[{...turn,sourceUrls:['https://example.com/b']}])]) expect(other).not.toBe(key);
});
