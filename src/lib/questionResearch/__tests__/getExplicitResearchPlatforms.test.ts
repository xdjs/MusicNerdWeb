import { getExplicitResearchPlatforms } from '../getExplicitResearchPlatforms';
it.each([
  ['What did Pete post most recently on InProcess?', ['inprocess']],
  ['Anything new on In Process?', ['inprocess']],
  ['Latest on in-process.world?', ['inprocess']],
  ['Latest on https://www.inprocess.world/person?', ['inprocess']],
  ['Compare Spotify and Deezer releases', ['spotify', 'deezer']],
  ['What did they say on X?', ['x']],
  ['What is the Artist X Producer collaboration?', []],
  ['What is this song on https://open.spotify.com/track/example?', ['spotify']],
  ['https://instagram.com.evil.example/post', []],
  ['What is the latest?', []],
  ['Is he in process of recording an album?', []],
  ['Compare In Process and Instagram', ['instagram', 'inprocess']],
])('extracts explicit source scope from %s', (question, expected) => {
  expect(getExplicitResearchPlatforms(question)).toEqual(expected);
});
