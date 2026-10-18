'use client';

import AboutCorrectionEditor from './AboutCorrectionEditor';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { researchAttribution } from '@/lib/activity/researchAttribution';
import type { ReviewItem } from '@/lib/contributions/adminReviewTypes';
import type { ReviewAction } from './reviewAdminItem';

export default function LoreReviewRow({ item, selected, disabled, error, onSelect, onReview, onSaved, onEditingChange }: {
  item: ReviewItem; selected: boolean; disabled: boolean; error?: string;
  onSaved: () => void; onEditingChange: (editing: boolean) => void;
  onSelect: () => void; onReview: (action: ReviewAction) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const actor = item.actorName || (item.actorKind === 'user' ? 'Deleted account' : item.actorKind === 'system' ? 'Music Nerd system' : 'Unknown account');
  const label = item.type === 'links' ? 'Link' : item.type === 'sources' ? 'Lore source' : 'About correction';
  return <li className={`p-4 sm:p-5 ${selected ? 'bg-pastypink/10' : ''}`}>
    <div className="flex items-start gap-3">
      <input type="checkbox" checked={selected} disabled={disabled} onChange={onSelect} aria-label={`Select ${label} for ${item.artistName}: ${item.title}`} className="mt-1 h-5 w-5 shrink-0 accent-pastypink" />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><Link href={`/artist/${item.artistId}`} target="_blank" className="font-semibold underline-offset-4 hover:underline">{item.artistName || 'Unknown artist'} ↗</Link><span className="text-xs text-muted-foreground">{label}</span></div>
        <p className="break-words text-sm font-medium">{item.type === 'corrections' ? ({ incorrect: 'Incorrect information', wrong_artist: 'Wrong artist', outdated: 'Outdated information', other: 'Something else' }[item.reason ?? ''] || 'About correction') : item.title || label}</p>
        {item.type === 'corrections' && <>
          {item.details && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{item.details}</p>}
          <div className="rounded-xl border border-border p-3 text-sm"><p className="mb-2 text-xs text-muted-foreground">Reported About</p><p className={`whitespace-pre-wrap break-words leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>{item.bioSnapshot}</p>{item.bioSnapshot && item.bioSnapshot.length > 180 && <button type="button" onClick={() => setExpanded(!expanded)} className="mt-2 text-xs underline">{expanded ? 'Show less' : 'Show more'}</button>}</div>
        </>}
        {item.url && (/^https?:\/\//i.test(item.url) ? <a href={item.url} target="_blank" rel="noopener noreferrer" className="block break-all text-sm underline underline-offset-4">{item.url}</a> : <p className="break-all text-sm">{item.url}</p>)}
        <p className="text-xs leading-relaxed text-muted-foreground">{item.origin === 'research' ? researchAttribution(actor, item.trigger).actorLabel : `Submitted by ${actor}`}{item.createdAt && <> · {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</>}</p>
        {item.type === 'corrections' && <AboutCorrectionEditor reportId={item.id} disabled={disabled} onSaved={onSaved} onEditingChange={value => { setEditing(value); onEditingChange(value); }} />}
        {!editing && <div className="flex flex-wrap gap-2">{item.type === 'corrections' ? <><Button disabled={disabled} onClick={() => onReview('resolved')}>Mark resolved</Button><Button variant="outline" disabled={disabled} onClick={() => onReview('dismissed')}>Dismiss</Button></> : <><Button disabled={disabled} onClick={() => onReview('approved')}>Approve</Button>{item.type === 'sources' && <Button variant="outline" disabled={disabled} onClick={() => onReview('rejected')}>Reject</Button>}</>}</div>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  </li>;
}
