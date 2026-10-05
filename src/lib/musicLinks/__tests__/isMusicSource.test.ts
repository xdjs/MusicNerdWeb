import { isMusicSource } from '../isMusicSource';
import { inferTypeFromUrl } from '@/lib/source/sourceTypes';

it.each(['soundcloud.com','mixcloud.com','audius.co'])('preserves ambiguous/spoken audio at inference and display (%s)', host => {
  const url = `https://${host}/show/an-interview`;
  expect(inferTypeFromUrl(url)).toBe('audio');
  expect(isMusicSource({url, type:inferTypeFromUrl(url)})).toBe(false);
  expect(isMusicSource({url, type:'interview'})).toBe(false);
  expect(isMusicSource({url, type:'music',podcastEpisodeKey:'episode'})).toBe(false);
  expect(isMusicSource({url, type:'music'})).toBe(true);
  expect(isMusicSource({url:`https://${host}/artist`})).toBe(true);
});
