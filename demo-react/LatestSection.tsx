import React,{useContext} from 'react';
import LatestCards from '@/app/artist/[id]/_components/LatestCards';
import LatestRefreshControl from '@/app/artist/[id]/_components/LatestRefreshControl';
import {OnboardingProgressContext}from'@/app/artist/[id]/_components/onboarding/OnboardingProgressContext';
import raw from './fixture.json';
export default function LatestSection({artist,imageUrl,listenLinks=[]}:any){const c=useContext(OnboardingProgressContext);return <LatestCards showFilters={false} refreshControl={<LatestRefreshControl artistId={artist.id}/>} artistName={artist.name} artistImage={imageUrl} unavailable={false} items={c?.steps.profiles===null?[]:raw.latest as any} artistListeningLinks={listenLinks}/>}
