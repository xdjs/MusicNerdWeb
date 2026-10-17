import { parsePublicArtistAbout } from '../parsePublicArtistAbout';
const source = { id: 'source-id', url: 'https://artist.example/about', label: 'Artist biography' };
const about = { version: 1, bio: 'A musician from Puerto Rico.', kind: 'researched', sources: [source] };
it('projects only the public prose and citations', () => {
 expect(parsePublicArtistAbout({ ...about, document: 'private', manifest: ['private'] })).toEqual({bio: about.bio, kind: about.kind, sources: [source]});
});
it.each([null, {}, {...about, version: 0}, {...about, bio: ''}, {...about, sources: []}, {...about, kind: 'unknown'}, {...about, sources: [{...source,url:'javascript:alert(1)'}]}])('fails closed for invalid or legacy output %p', value => {
 expect(parsePublicArtistAbout(value)).toBeNull();
});
