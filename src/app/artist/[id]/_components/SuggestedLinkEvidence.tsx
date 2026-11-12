import type { LinkSuggestion } from '@/lib/artistLinkReview/types';

/** Explain only recorded provenance, never turn a suggestion into ownership proof. */
export default function SuggestedLinkEvidence({ item }: { item: LinkSuggestion }) {
  if (item.status !== 'pending') return null;
  const research = item.origin === 'research';
  const evidence = research && item.evidence;
  return <div className="mt-2 space-y-2">
    <span className="inline-flex rounded-full border border-black/15 bg-black/5 px-2.5 py-1 text-xs font-medium text-foreground dark:border-white/20 dark:bg-white/10">
      {research ? 'Needs confirmation' : 'Awaiting review'}
    </span>
    {research && <div className="space-y-1.5 break-words text-sm leading-relaxed text-muted-foreground">
      {evidence ? <>
        <p className="font-medium text-foreground">Why this was suggested</p>
        <p>{evidence.summary}</p>
        {evidence.observedTitle && <p><span className="font-medium">Recorded title: </span><span className="break-words">{evidence.observedTitle}</span></p>}
        <p>This explains how it was found, not proof that the account belongs to you.</p>
      </> : <p>The discovery reason was not saved with this suggestion. Open the profile and check it before adding it.</p>}
    </div>}
  </div>;
}
