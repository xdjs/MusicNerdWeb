import { projectPublicLoreSources } from '../projectPublicLoreSources';

const source = { id: 's', url: 'https://example.com/article', status: 'approved', publication: 'inherit', title: 'Article', extractedText: 'Full source body' };

it('preserves approved claimed access but strips original text from public props', () => {
  expect(projectPublicLoreSources([source], true)).toEqual([{ ...source, extractedText: null }]);
  expect(source.extractedText).toBe('Full source body');
});
it('publishes approved unclaimed Lore only after explicit source decision', () => {
  expect(projectPublicLoreSources([source], false)).toEqual([]);
  expect(projectPublicLoreSources([{ ...source, publication: 'public' }], false)).toHaveLength(1);
});
it.each(['pending', 'rejected'])('does not expose %s even if marked public', status => {
  expect(projectPublicLoreSources([{ ...source, status, publication: 'public' }], true)).toEqual([]);
});
it.each([true, false])('private sources remain excluded with claimed=%s', claimed => {
  expect(projectPublicLoreSources([{ ...source, publication: 'private' }], claimed)).toEqual([]);
});
it('retains explicit approved PDF metadata without granting ownership or returning body text', () => {
  const pdf = { ...source, publication: 'public', filePath: 'artist/doc.pdf', contentType: 'application/pdf' };
  expect(projectPublicLoreSources([pdf], false)).toEqual([{ ...pdf, extractedText: null }]);
});
it('fails closed on unknown publication values and absent approval', () => {
  expect(projectPublicLoreSources([{ ...source, publication: 'garbage' }], true)).toEqual([]);
  expect(projectPublicLoreSources([{ url: source.url, publication: 'public' }], false)).toEqual([]);
});
it('omits private rows entirely from serialized public props, including file URLs and paths', () => {
  const privateSource = { ...source, id: 'hidden-id', publication: 'private', url: 'https://example.com/hidden.pdf', filePath: 'hidden/path.pdf', title: 'Hidden title' };
  const result = projectPublicLoreSources([source, privateSource], true);
  expect(result).toEqual([{ ...source, extractedText: null }]);
  for (const value of [privateSource.id, privateSource.url, privateSource.filePath, privateSource.title]) {
    expect(JSON.stringify(result)).not.toContain(value);
  }
});

it('retains verified submission trust without a claim while privacy and moderation override it',()=>{
 const source={id:'s',status:'approved',publication:'inherit',trustedAtSubmission:true,extractedText:'private body'};
 expect(projectPublicLoreSources([source],false)).toEqual([{...source,extractedText:null}]);
 for(const override of [{publication:'private'},{status:'pending'},{status:'rejected'},{trustedAtSubmission:false}]) expect(projectPublicLoreSources([{...source,...override}],false)).toEqual([]);
});
