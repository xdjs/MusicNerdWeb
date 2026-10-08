import providerInformationUrls from './fixtures/providerInformationUrls.json';
import { getSourceLinks } from '../getSourceLinks';
import { isDestinationSource } from '../isDestinationSource';
import { parseMusicDestination } from '../parseMusicDestination';
import { getListeningLinks } from '@/lib/artist/getListeningLinks';
import { SOURCE_TYPES } from '@/lib/source/sourceTypes';

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
      ['peterango.com', 'website'], ['Apple Music', 'artist'], ['Beatport', 'artist'],
    ]);
    expect(JSON.stringify(sources)).toBe(original);
    expect(sources.filter(isDestinationSource)).toHaveLength(3);
  });
  it('separates support destinations for the support section and onboarding prompt', () => {
    expect(getSourceLinks([...sources, source('support-artist', 'https://peterango.bandcamp.com/')], [], 'support')).toEqual([expect.objectContaining({sourceId: 'support-artist', label: 'Bandcamp'})]);
  });
  it('keeps Subvert policy and update sources out of Support and artist Listen candidates', () => {
    const information = ['changelog', 'privacy-policy', 'terms-of-use'].map(slug =>
      source(slug, `https://subvert.fm/${slug}/`, 'article'));
    expect(information.some(isDestinationSource)).toBe(false);
    expect(getSourceLinks(information, [], 'support')).toEqual([]);
    expect(getSourceLinks(information)).toEqual([]);
  });
  it('retains a legacy Subvert release in Lore instead of Support', () => {
    const release = source('subvert-release', 'https://subvert.fm/dutchyyy/releases/unfinished-hugs', 'article', 'Unfinished Hugs');
    expect(isDestinationSource(release)).toBe(false);
    expect(getSourceLinks([release], [], 'support')).toEqual([]);
  });
  it('keeps existing direct artist links and deduplicates catalog profile variants', () => {
    const existing = [{ siteName: 'applemusic', href: 'https://music.apple.com/artist/42', label: 'Apple Music', iconSrc: '' }];
    expect(getSourceLinks([...sources, source('alternate', 'https://beatport.com/artist/renamed/1041889')], existing).map(link => link.sourceId)).toEqual(['website', 'beatport']);
  });
  it('routes independent artist profiles without exposing pending sources', () => {
    const records = [
      source('subvert', 'https://subvert.fm/pete-rango'),
      source('supercollector', 'https://release.supercollector.xyz/artist/joey-collins'),
      source('soundcloud', 'https://soundcloud.com/dutchyyy', 'music'),
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
  expect(isDestinationSource({...spoken, type:'music'})).toBe(false);
});

it.each(['soundcloud.com', 'mixcloud.com', 'audius.co'])('keeps explicitly audio-typed show profiles in Lore rather than Links or Listen (%s)', host => {
  const spoken = { ...source('spoken', `https://${host}/show`, 'audio'), status: 'approved' };
  expect(isDestinationSource(spoken)).toBe(false);
  expect(getSourceLinks([spoken])).toEqual([]);
  const artist = { spotify:null, deezer:null };
  expect(getListeningLinks(artist, [], [spoken])).toEqual([]);
  const music = { ...spoken, type:'music' };
  expect(getSourceLinks([music])).toHaveLength(1);
  expect(getListeningLinks(artist, [], [music])).toHaveLength(1);
});

it('keeps accepted HTTP websites and catalog sources visible in Links', () => {
  const records = [source('site', 'http://peterango.com/', 'website'), source('apple', 'http://music.apple.com/us/artist/pete-rango/1513734272', 'profile')];
  expect(records.every(isDestinationSource)).toBe(true);
  expect(getSourceLinks(records).map(link => link.href)).toEqual(records.map(record => record.url));
});

it('keeps the audited provider information sources out of Links, Support and Listen candidates', () => {
  const records = providerInformationUrls.map((url,id) => source(String(id),url,'article'));
  expect(records.filter(isDestinationSource)).toEqual([]);
  expect(getSourceLinks(records)).toEqual([]);
  expect(getSourceLinks(records, [], 'support')).toEqual([]);
});

describe.each(['soundcloud.com', 'mixcloud.com', 'audius.co'])('mixed-use source classification: %s', host => {
  describe.each(['artist', 'release'])('%s URLs', kind => {
    it.each(SOURCE_TYPES)('preserves the placement contract for type=%s with and without podcast evidence', type => {
      const url = `https://${host}/show${kind === 'release' ? '/a-conversation' : ''}`;
      const record = { ...source('source',url,type), status:'approved' };
      const routesToLinks = kind === 'artist' && !['audio','interview'].includes(type);
      expect(isDestinationSource(record)).toBe(routesToLinks);
      expect(getSourceLinks([record])).toHaveLength(routesToLinks ? 1 : 0);
      expect(getListeningLinks({spotify:null,deezer:null},[],[record])).toHaveLength(routesToLinks && kind === 'artist' ? 1 : 0);
      const podcast = { ...record, podcastEpisodeKey:'episode' };
      expect(isDestinationSource(podcast)).toBe(false);
      expect(getSourceLinks([podcast])).toEqual([]);
      expect(getListeningLinks({spotify:null,deezer:null},[],[podcast])).toEqual([]);
    });
  });
});


describe('release source placement', () => {
  const releases = [
    'https://open.spotify.com/album/3DmaZbBPnKSGnxYRpHobss',
    'https://open.spotify.com/track/3DmaZbBPnKSGnxYRpHobss',
    'https://music.apple.com/us/album/rush/123?i=456',
    'https://music.apple.com/us/song/rush/456',
    'https://www.beatport.com/track/rush/123',
    'https://www.beatport.com/release/rush/123',
    'https://www.deezer.com/album/123',
    'https://listen.tidal.com/track/123',
    'https://www.qobuz.com/us-en/album/rush/abc123',
    'https://music.amazon.com/albums/B0012345AB',
    'https://peterango.bandcamp.com/album/rush',
    'https://subvert.fm/pete-rango/tracks/rush',
    'https://release.supercollector.xyz/yin-yang-joey-collins',
    'https://soundcloud.com/pete-rango/rush',
    'https://audius.co/pete-rango/rush',
    'https://mixcloud.com/pete-rango/rush',
  ];
  it.each(releases)('keeps %s as a source rather than an artist destination, regardless of source type', url => {
    expect(parseMusicDestination(url)?.kind).toBe('release');
    for (const type of SOURCE_TYPES) {
      const record = {...source('release', url, type), status: 'approved'};
      const original = {...record};
      expect(isDestinationSource(record)).toBe(false);
      expect(getSourceLinks([record])).toEqual([]);
      expect(getSourceLinks([record], [], 'support')).toEqual([]);
      expect(getListeningLinks({spotify:null,deezer:null},[],[record])).toEqual([]);
      expect(record).toEqual(original);
    }
  });
});

it('assigns local platform icons to source-backed Apple Music and Beatport artist links', () => {
  expect(getSourceLinks([
    source('apple','https://music.apple.com/us/artist/pete-rango/1513734272'),
    source('beatport','https://www.beatport.com/artist/pete-rango/1041889'),
  ]).map(link=>link.iconSrc)).toEqual(['/siteIcons/applemusic_icon.svg','/siteIcons/beatport_icon.svg']);
});
