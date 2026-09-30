import { getInstagramMentions } from '../getInstagramMentions';

it('preserves exact spans, case, repeated mentions and surrounding punctuation', () => {
    const text = 'Produced by (@cxy), @WhoIsEli. Mix: @liv.corp / @soft_core.music and @cxy!';
    const mentions = getInstagramMentions(text);
    expect(mentions.map(m => m.handle)).toEqual(['cxy', 'whoiseli', 'liv.corp', 'soft_core.music', 'cxy']);
    expect(mentions.map(m => text.slice(m.start, m.end))).toEqual(['@cxy', '@WhoIsEli', '@liv.corp', '@soft_core.music', '@cxy']);
    expect(mentions[0].href).toBe('https://www.instagram.com/cxy/');
});

it('supports one-character and maximum-length handles without truncating longer tokens', () => {
    expect(getInstagramMentions(`@x @${'a'.repeat(30)} @${'b'.repeat(31)}`).map(m => m.handle)).toEqual(['x', 'a'.repeat(30)]);
});

it.each([
    'mail user@example.com or user+tag@example.com',
    'https://example.com/@name www.example.com/@name https://example.com?q=@name',
    '@@name @foo..bar @.name @bad-name @café é@name @foo/bar',
    '<a href="javascript:alert(1)">hi</a> @evil<script>',
])('does not link emails, URL fragments, or malformed tokens: %s', text => {
    expect(getInstagramMentions(text)).toEqual([]);
});

it('keeps multiline captions and emoji next to mentions intact', () => {
    const text = '🎧@a_b\nThanks @whoiseli…';
    expect(getInstagramMentions(text).map(m => text.slice(m.start, m.end))).toEqual(['@a_b', '@whoiseli']);
});

it('accepts caption punctuation before mentions while keeping email and URL tokens plain', () => {
    const text = 'Producer:@cxy w/@whoiseli -@liv.corp info-@example.com example.com/@fake ftp://example.com/@fake';
    expect(getInstagramMentions(text).map(m => text.slice(m.start, m.end))).toEqual(['@cxy', '@whoiseli', '@liv.corp']);
});
