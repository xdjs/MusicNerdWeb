import { getSourceLinks } from '../getSourceLinks';
import { isDestinationSource } from '../isDestinationSource';

const source = (id: string, url: string, type = 'article', title = '') => ({ id, url, type, title });

describe('getSourceLinks', () => {
  const sources = [
    source('apple', 'https://music.apple.com/us/artist/pete-rango/1513734272', 'profile'),
    source('beatport', 'https://www.beatport.com/artist/pete-rango/1041889'),
    source('release', 'https://www.beatport.com/release/rush/6008044', 'article', 'rush'),
    source('website', 'https://peterango.com/', 'website'),
    source('review', 'https://pitchfork.com/reviews/some-album', 'review'),
    source('support', 'https://peterango.bandcamp.com/album/rush'),
  ];
  it('moves legacy music sources into named destinations without changing the records', () => {
    const original = JSON.stringify(sources);
    expect(getSourceLinks(sources).map(link => [link.label, link.kind])).toEqual([
      ['peterango.com', 'website'], ['Apple Music', 'artist'], ['Beatport', 'artist'], ['rush · Beatport', 'release'],
    ]);
    expect(JSON.stringify(sources)).toBe(original);
    expect(sources.filter(isDestinationSource)).toHaveLength(5);
  });
  it('separates support destinations for the support section and onboarding prompt', () => {
    expect(getSourceLinks(sources, [], 'support')).toEqual([expect.objectContaining({sourceId: 'support', label: 'Bandcamp'})]);
  });
  it('keeps Subvert policy and update sources out of Support and artist Listen candidates', () => {
    const information = ['changelog', 'privacy-policy', 'terms-of-use'].map(slug =>
      source(slug, `https://subvert.fm/${slug}/`, 'article'));
    expect(information.some(isDestinationSource)).toBe(false);
    expect(getSourceLinks(information, [], 'support')).toEqual([]);
    expect(getSourceLinks(information)).toEqual([]);
  });
  it('moves a legacy Subvert releases URL from Lore into Support without becoming an artist Listen link', () => {
    const release = source('subvert-release', 'https://subvert.fm/dutchyyy/releases/unfinished-hugs', 'article', 'Unfinished Hugs');
    expect(isDestinationSource(release)).toBe(true);
    expect(getSourceLinks([release], [], 'support')).toEqual([
      expect.objectContaining({sourceId: 'subvert-release', kind: 'release', href: release.url, label: 'Unfinished Hugs · Subvert'}),
    ]);
  });
  it('keeps existing direct artist links and deduplicates catalog profile variants', () => {
    const existing = [{ siteName: 'applemusic', href: 'https://music.apple.com/artist/42', label: 'Apple Music', iconSrc: '' }];
    expect(getSourceLinks([...sources, source('alternate', 'https://beatport.com/artist/renamed/1041889')], existing).map(link => link.sourceId)).toEqual(['website', 'beatport', 'release']);
  });
  it('routes independent music services and support releases without exposing pending sources', () => {
    const records = [
      source('subvert', 'https://subvert.fm/pete-rango/tracks/rush'),
      source('supercollector', 'https://release.supercollector.xyz/yin-yang-joey-collins'),
      source('soundcloud', 'https://soundcloud.com/dutchyyy/a-track', 'music'),
      source('spoken', 'https://mixcloud.com/dj/an-interview', 'interview'),
      { ...source('pending', 'https://audius.co/Dutchyyy'), status: 'pending' },
    ];
    expect(getSourceLinks(records, [], 'support').map(link => link.sourceId)).toEqual(['subvert', 'supercollector']);
    expect(getSourceLinks(records).map(link => link.sourceId)).toEqual(['soundcloud']);
    expect(isDestinationSource(records[3])).toBe(false);
  });
  it('keeps podcast sources in Lore and rejects unsafe official-site URLs', () => {
    const podcast = {...sources[0], podcastEpisodeKey: 'episode'};
    expect(isDestinationSource(podcast)).toBe(false);
    expect(getSourceLinks([podcast, source('unsafe', 'javascript:alert(1)', 'website')])).toEqual([]);
  });
});

it.each(['soundcloud.com', 'mixcloud.com', 'audius.co'])('does not infer music from a mixed-host release URL alone (%s)', host => {
  const spoken = source('spoken', `https://${host}/show/artist-conversation`, 'audio');
  expect(isDestinationSource(spoken)).toBe(false);
  expect(getSourceLinks([spoken])).toEqual([]);
  expect(isDestinationSource({...spoken, type:'music'})).toBe(true);
});

it('keeps accepted HTTP websites and catalog sources visible in Links', () => {
  const records = [source('site', 'http://peterango.com/', 'website'), source('apple', 'http://music.apple.com/us/artist/pete-rango/1513734272', 'profile')];
  expect(records.every(isDestinationSource)).toBe(true);
  expect(getSourceLinks(records).map(link => link.href)).toEqual(records.map(record => record.url));
});
