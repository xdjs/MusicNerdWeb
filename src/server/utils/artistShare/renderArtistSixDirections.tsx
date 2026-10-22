import { ImageResponse } from 'next/og';
import { getShareArtistName } from '@/lib/artistShare/getShareArtistName';
import { getShareBioExcerpt } from '@/lib/artistShare/getShareBioExcerpt';
import { getShareCallToAction } from '@/lib/artistShare/getShareCallToAction';
import { shareGlasses, shareImageFonts } from './shareImageAssets';
import type { CSSProperties } from 'react';

export const sixDirections = ['manifesto', 'orbit', 'checkerboard', 'panorama', 'monogram', 'margin'] as const;
export type SixDirection = typeof sixDirections[number];
/** Preview studies only. Public eligibility and image normalization precede rendering. */
export function renderArtistSixDirections(name: string, portrait: string | null, publicBio: string | null | undefined, layout: SixDirection, palette: 'white' | 'logo' | 'pink' = 'logo', cta: 'know' | 'music' | 'meet' | 'explore' | 'story' | 'read' = 'know') {
    const safeName = getShareArtistName(name);
    const chars = Array.from(safeName);
    const displayName = chars.length > 80 ? `${chars.slice(0,79).join('')}…` : safeName;
    const excerpt = getShareBioExcerpt(publicBio, 100);
    const pink = palette === 'pink' ? '#ff9ce3' : '#fb57c0';
    const invitation = getShareCallToAction(name, cta, Boolean(excerpt)).replace(chars.length > 12 ? safeName : '\u0000', 'the artist');
    const abs: CSSProperties = { display:'flex', position:'absolute' };
    const text: CSSProperties = { display:'-webkit-box', WebkitBoxOrient:'vertical', textOverflow:'ellipsis', overflow:'visible', wordBreak:'break-word', paddingRight:12, paddingBottom:8 };
    const title = (x:number,y:number,w:number,size:number,lines=2) => <div style={{...abs,...text,left:x,top:y,width:w,fontSize:chars.length>24?36:chars.length>10?Math.min(size,48):size,fontWeight:700,lineHeight:1.05,letterSpacing:'-1.5px',WebkitLineClamp:lines}}>{displayName}</div>;
    const bio = (x:number,y:number,w:number,size=36,lines=4) => excerpt ? <div style={{...abs,...text,left:x,top:y,width:w,fontSize:size,lineHeight:1.2,WebkitLineClamp:lines}}>{excerpt}</div> : null;
    const action = (x:number,y:number,w=900) => <div style={{...abs,left:x,top:y,width:w,fontSize:28,fontWeight:700,lineHeight:1.2,wordBreak:'break-word'}}>{invitation}</div>;
    const image = (x:number,y:number,w:number,h:number,radius:number|string=0,fit:'cover'|'contain'='cover',position='50% 50%') => <div style={{...abs,left:x,top:y,width:w,height:h,borderRadius:radius,overflow:'hidden',background:'#ffffff',alignItems:'center',justifyContent:'center'}}>{portrait
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={portrait} alt="" width={w} height={h} style={{objectFit:fit,objectPosition:position}} />
        : <div style={{width:Math.min(w,h)*.6,height:Math.min(w,h)*.6,border:'10px solid #171717',borderRadius:'50%'}} />}</div>;
    const box = (x:number,y:number,w:number,h:number,color:string,radius:number|string=0) => <div style={{...abs,left:x,top:y,width:w,height:h,background:color,borderRadius:radius}} />;
    return new ImageResponse(<div style={{...abs,width:1200,height:630,overflow:'hidden',background:pink,color:'#171717',fontFamily:'Inter'}}>
        {layout==='manifesto' && <>
            {excerpt ? bio(44,36,1110,60,4) : title(44,42,1090,96,3)}
            {box(44,378,1110,2,'#171717')}{image(44,410,150,166,0,'contain')}
            {excerpt && title(226,410,860,64,2)}{action(226,555,800)}
        </>}
        {layout==='orbit' && <>
            {box(28,148,444,444,'#ffffff','50%')}{image(48,168,404,404,'50%','contain')}
            {box(500,145,650,420,'#ffffff','50%')}{title(40,26,1120,82,2)}{bio(610,220,430,36,5)}{action(610,470,430)}
        </>}
        {layout==='checkerboard' && <>
            {box(600,0,600,315,'#ffffff')}{box(0,315,600,315,'#ffffff')}
            {image(600,0,600,315,0,'contain')}{title(36,54,530,76,3)}
            {bio(36,354,520,38,5)}{action(648,416,480)}
        </>}
        {layout==='panorama' && <>
            {box(0,0,1200,630,'#ffffff')}{title(36,24,1120,110,2)}
            {portrait ? <div style={{...abs,left:0,top:165,width:1200,height:260,overflow:'hidden'}}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={portrait} alt="" width={1200} height={1335} style={{...abs,top:-330,objectFit:'cover'}} />
            </div> : image(0,165,1200,260)}{box(0,425,1200,205,pink)}
            {bio(36,448,1090,36,2)}{action(36,562,1000)}
        </>}
        {layout==='monogram' && <>
            <div style={{...abs,left:28,top:-25,fontSize:570,fontWeight:700,lineHeight:1,color:'#ffffff'}}>{chars.length && safeName!=='Discover this artist' && safeName!=='Unknown Artist' ? chars[0] : ''}</div>
            {image(250,330,230,230,'50%','contain')}{box(510,30,660,570,'#ffffff')}
            {title(546,70,580,76,3)}{bio(546,292,570,36,4)}{action(546,526,510)}
        </>}
        {layout==='margin' && <>
            {box(24,24,810,582,'#ffffff')}{image(48,48,762,350,0,'contain')}
            {title(48,426,744,70,2)}{action(48,558,730)}
            {bio(866,70,300,34,9)}
        </>}
        <div style={{...abs,right:28,bottom:20}}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shareGlasses} alt="Music Nerd glasses" width={78} height={55} />
        </div>
    </div>,{width:1200,height:630,fonts:shareImageFonts,headers:{'Cache-Control':'public, max-age=3600, s-maxage=3600'}});
}
