import type { ArtistVaultSource } from '@/server/db/DbTypes';

export default function SourceAttribution({ source }: { source: ArtistVaultSource }) {
  const name = source.contributorName?.trim() || 'a contributor';
  const label = source.origin === 'submission' ? `Suggested by ${name}`
    : source.origin === 'upload' ? `Uploaded by ${name}`
    : source.origin === 'research' ? 'Found by automated research' : 'Contributor unknown';
  const date = source.createdAt ? new Date(source.createdAt) : null;
  const validDate = date && Number.isFinite(date.getTime());
  return <p className="mt-2 text-xs text-muted-foreground break-words">
    <span>{label}</span><span aria-hidden="true"> · </span>
    {validDate ? <time dateTime={date.toISOString()} title={`Added ${date.toUTCString()}`}>
      {date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}
    </time> : <span>Date unavailable</span>}
  </p>;
}
