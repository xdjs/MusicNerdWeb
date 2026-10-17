'use client';

import type { ReactNode } from 'react';
import MusicNerdSelect from '@/components/ui/MusicNerdSelect';

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  linksCount: number;
  sourcesCount: number;
  correctionsCount: number;
  linksContent: ReactNode;
  sourcesContent: ReactNode;
  correctionsContent: ReactNode;
};

/** One review destination, keeping each contribution type's existing review actions. */
export default function LoreReviewQueue({value,onValueChange,linksCount,sourcesCount,correctionsCount,linksContent,sourcesContent,correctionsContent}: Props) {
  const sections = [
    {value:'corrections',label:'About corrections',count:correctionsCount,content:correctionsContent},
    {value:'links',label:'Links',count:linksCount,content:linksContent},
    {value:'sources',label:'Lore sources',count:sourcesCount,content:sourcesContent},
  ];
  return <div className="space-y-6">
    <div className="max-w-sm space-y-2">
      <label htmlFor="review-type" className="text-sm text-muted-foreground">Review type</label>
      <MusicNerdSelect id="review-type" label="Review type" value={value} onValueChange={onValueChange} options={[
        {value:'all',label:`All (${linksCount + sourcesCount + correctionsCount})`},
        ...['links','sources','corrections'].map(type=>{const section=sections.find(item=>item.value===type)!;return {value:type,label:`${section.label} (${section.count})`};}),
      ]} />
    </div>
    {sections.filter(section=>value==='all'||section.value===value).map(section=><section key={section.value} aria-label={`${section.label} review`} className="min-w-0 space-y-4 border-t border-border pt-5">
      <h3 className="text-lg font-semibold">{section.label} <span className="ml-2 text-sm font-normal text-muted-foreground">{section.count} pending</span></h3>
      {section.content}
    </section>)}
  </div>;
}
