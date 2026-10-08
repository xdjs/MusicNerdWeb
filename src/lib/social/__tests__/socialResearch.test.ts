import { storedReelTranscript } from '@/lib/social/storedReelTranscript';
import { socialPostKeyFromUrl } from '@/lib/social/socialPostKeyFromUrl';
import { reelAudioCandidates } from '@/lib/social/reelAudioCandidates';

describe('stored social research', () => {
  it('trusts only the dedicated actor provenance and bounds the transcript', () => {
    expect(storedReelTranscript({transcript:'arbitrary'})).toBeNull();
    expect(storedReelTranscript({_musicnerdTranscript:{version:1,actor:'wrong',text:'speech'}})).toBeNull();
    expect(storedReelTranscript({_musicnerdTranscript:{version:1,actor:'apify/instagram-reel-scraper',text:'x'.repeat(15000)}})).toHaveLength(12000);
  });
  it('keeps complete platform IDs and historical Instagram keys', () => {
    expect(socialPostKeyFromUrl('https://www.instagram.com/p/A_B/')).toBe('A_B');
    expect(socialPostKeyFromUrl('https://www.instagram.com/reel/Abc/')).toBe('https_www_instagram_com_reel_abc');
    expect(socialPostKeyFromUrl('https://www.tiktok.com/@averylongartistusername/video/7420000000000000001')).toBe('tiktok_7420000000000000001');
    expect(socialPostKeyFromUrl('https://www.tiktok.com/@averylongartistusername/video/7420000000000000002')).toBe('tiktok_7420000000000000002');
    expect(socialPostKeyFromUrl('https://x.com/artist/status/7420000000000000001')).toBe('x_7420000000000000001');
  });
  it('offers audio as unverified-speaker context with the original citation', () => {
    const post={platform:'instagram',isOwnPost:true,url:'https://www.instagram.com/p/AUDIO/',postedAt:'2026-10-02',transcript:'I layer the drums first.'};
    const [candidate]=reelAudioCandidates([post], 'Artist');
    expect(candidate).toMatchObject({key:'social_audio_AUDIO',kind:'audio',authoredBy:'speaker unverified',sourceUrls:[post.url]});
    expect(candidate.material).toContain('speaker is unverified');
    expect(reelAudioCandidates([{...post,isOwnPost:false},{...post,platform:'tiktok'}],'Artist')).toEqual([]);
  });
});
