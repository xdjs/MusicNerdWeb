import { useEffect, useState } from 'react';

export default function useBookmarkedArtistSummaries(ids: string[]) {
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const key = ids.slice(0, 6).join(',');
  useEffect(() => {
    const controller = new AbortController();
    setSummaries({});
    if (!key) return;
    const params = new URLSearchParams();
    key.split(',').forEach(id => params.append('id', id));
    fetch(`/api/profile/artist-summaries?${params}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) return;
      const rows: { id: string; bio: string | null }[] = await response.json();
      if (!controller.signal.aborted && Array.isArray(rows)) setSummaries(Object.fromEntries(rows.filter(row => row.bio).map(row => [row.id, row.bio!])));
    }).catch(() => { /* Artist navigation remains useful if the summary is unavailable. */ });
    return () => controller.abort();
  }, [key]);
  return summaries;
}
