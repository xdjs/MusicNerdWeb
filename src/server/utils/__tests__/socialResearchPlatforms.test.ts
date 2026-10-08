import { deriveSocialSignals, type SocialPostRow } from '@/server/utils/socialSignals';

const post = (url:string,platform:string,likeCount:number): SocialPostRow => ({platform,platformPostId:url,url,ownerUsername:'artist',isOwnPost:true,caption:null,postedAt:'2026-10-02',likeCount,commentCount:null,playCount:null,hashtags:[],mentions:[],coauthors:[],musicTitle:null,musicArtist:null});

it('keeps Instagram and X engagement baselines separate', () => {
    const posts=[...Array.from({length:7},(_,i)=>post(`ig${i}`,'instagram',10)),...Array.from({length:7},(_,i)=>post(`x${i}`,'x',10000)),post('ig-hit','instagram',100)];
    expect(deriveSocialSignals(posts,'artist').standoutPosts.map(p=>p.url)).toEqual(['ig-hit']);
});
