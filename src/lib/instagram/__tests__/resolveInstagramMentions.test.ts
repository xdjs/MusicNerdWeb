import { resolveInstagramMentions } from '../resolveInstagramMentions';

it('returns only complete handles present in supplied Instagram evidence', () => {
    expect(resolveInstagramMentions('Produced by @cxy, @WHOISELI, @fake and @whoiseli_extra.', [
        { url: 'https://www.instagram.com/p/real/', text: 'Executive producers: @cxy and @whoiseli' },
        { url: 'https://example.com/article', text: '@fake' },
        { url: 'https://instagram.com.evil.test/p/x/', text: '@fake' },
    ])).toEqual(['cxy', 'whoiseli']);
});

it('accepts Reel sources and deduplicates handles without conflating periods or underscores', () => {
    expect(resolveInstagramMentions('@a.b @a_b @a.b', [
        { url: 'https://instagram.com/reel/real/', text: '@a.b' },
    ])).toEqual(['a.b']);
});

it('does not infer handles from bare names, profile links or credentials in source URLs', () => {
    expect(resolveInstagramMentions('@andré @fake @cxy', [
        { url: 'https://www.instagram.com/p/real/', text: 'André and cxy helped' },
        { url: 'https://instagram.com/fake/', text: '@fake' },
        { url: 'https://evil:secret@instagram.com/p/x/', text: '@cxy' },
    ])).toEqual([]);
});
