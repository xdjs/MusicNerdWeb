"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import type {
  ArtistDataSummary,
  PlatformIdCoverageItem,
  ArtistLinkCoverageItem,
  CompletenessBucket,
  EnrichmentReadiness,
} from "@/server/utils/queries/artistDataQueries";

// --- Reusable coverage card grid ---

interface CoverageItem {
  label: string;
  count: number;
  percentage: number;
  todayCount: number;
}

function CoverageGrid({ items }: { items: CoverageItem[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-md border bg-card p-3">
          <div className="text-sm font-medium">{item.label}</div>
          <div className="text-2xl font-bold">{item.count.toLocaleString()}</div>
          <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-[#9b83a0]"
              style={{ width: `${Math.min(item.percentage, 100)}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {item.percentage}%
            {item.todayCount > 0 && (
              <span className="ml-1 text-green-400">+{item.todayCount} today</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Section 1: Platform ID Coverage ---

function PlatformIdCoverageSection({
  coverage,
  totalWithSpotify,
}: {
  coverage: PlatformIdCoverageItem[];
  totalWithSpotify: number;
}) {
  const items: CoverageItem[] = coverage.map((p) => ({
    label: p.platform,
    count: p.count,
    percentage: p.percentage,
    todayCount: p.todayCount,
  }));

  return (
    <div>
      <h3 className="text-lg font-semibold text-[#9b83a0] mb-3">
        Platform ID Coverage ({totalWithSpotify.toLocaleString()} artists with Spotify)
      </h3>
      <CoverageGrid items={items} />
    </div>
  );
}

// --- Section 2: Artist Link Coverage ---

const CATEGORY_ORDER: Record<string, number> = { social: 0, listen: 1, reference: 2, content: 3 };
const CATEGORY_LABELS: Record<string, string> = {
  social: "Social",
  listen: "Listen",
  reference: "Reference",
  content: "Content",
};

function ArtistLinkCoverageSection({
  coverage,
  totalArtists,
}: {
  coverage: ArtistLinkCoverageItem[];
  totalArtists: number;
}) {
  // Group by category
  const grouped = new Map<string, ArtistLinkCoverageItem[]>();
  for (const item of coverage) {
    const list = grouped.get(item.category) ?? [];
    list.push(item);
    grouped.set(item.category, list);
  }

  const sortedCategories = [...grouped.entries()].sort(
    (a, b) => (CATEGORY_ORDER[a[0]] ?? 99) - (CATEGORY_ORDER[b[0]] ?? 99)
  );

  return (
    <div>
      <h3 className="text-lg font-semibold text-[#9b83a0] mb-3">
        Artist Link Coverage ({totalArtists.toLocaleString()} artists)
      </h3>
      <div className="space-y-4">
        {sortedCategories.map(([category, items]) => (
          <div key={category}>
            <h4 className="text-sm text-muted-foreground font-medium uppercase tracking-wide mb-2">
              {CATEGORY_LABELS[category] ?? category}
            </h4>
            <CoverageGrid
              items={items.map((item) => ({
                label: item.column,
                count: item.count,
                percentage: item.percentage,
                todayCount: item.todayCount,
              }))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Section 3: Data Completeness Distribution ---

function CompletenessSection({
  distribution,
  median,
  average,
  totalArtists,
}: {
  distribution: CompletenessBucket[];
  median: number;
  average: number;
  totalArtists: number;
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-[#9b83a0] mb-3">
        Data Completeness ({totalArtists.toLocaleString()} artists)
      </h3>
      <div className="rounded-md border bg-card p-4">
        <div className="space-y-2">
          {distribution.map((b) => (
            <div key={b.bucket} className="flex items-center gap-3">
              <span className="w-24 text-sm text-right font-mono">{b.bucket} fields</span>
              <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#9b83a0]"
                  style={{ width: `${Math.min(b.percentage, 100)}%` }}
                />
              </div>
              <span className="w-32 text-sm text-muted-foreground text-right">
                {b.count.toLocaleString()} ({b.percentage}%)
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-6 mt-4 text-sm text-muted-foreground border-t pt-3">
          <span>
            Median: <strong className="text-foreground">{median}</strong> fields
          </span>
          <span>
            Average: <strong className="text-foreground">{average}</strong> fields
          </span>
        </div>
      </div>
    </div>
  );
}

// --- Section 4: Enrichment Readiness ---

function EnrichmentReadinessSection({ readiness }: { readiness: EnrichmentReadiness }) {
  const cards = [
    {
      value: readiness.hasWikidata,
      label: "Has Wikidata ID",
      sublabel: "Can be enriched further",
    },
    {
      value: readiness.hasSpotifyNoWikidata,
      label: "Has Spotify, no Wikidata",
      sublabel: "Need agent/manual work",
    },
    {
      value: readiness.noSpotify,
      label: "No Spotify ID",
      sublabel: "No cross-platform mapping possible",
    },
  ];

  return (
    <div>
      <h3 className="text-lg font-semibold text-[#9b83a0] mb-3">Enrichment Readiness</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-md border bg-card p-4 text-center">
            <div className="text-3xl font-bold">{card.value.toLocaleString()}</div>
            <div className="text-sm font-medium mt-1">{card.label}</div>
            <div className="text-xs text-muted-foreground">{card.sublabel}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Main component ---

export default function ArtistDataSection() {
  const [data, setData] = useState<ArtistDataSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [autoPoll, setAutoPoll] = useState(false);
  const fetchInFlight = useRef(false);

  const fetchData = useCallback(async (background = false) => {
    if (fetchInFlight.current) return;
    fetchInFlight.current = true;
    try {
      if (!background) { setLoading(true); setError(""); }
      const res = await fetch("/api/admin/artist-data");
      if (!res.ok) {
        if (!background) {
          const body = await res.json().catch(() => ({}));
          setError(body.error || `Failed to load (${res.status})`);
        }
        return;
      }
      setData(await res.json());
    } catch {
      if (!background) setError("Failed to load artist data");
    } finally {
      if (!background) setLoading(false);
      fetchInFlight.current = false;
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!autoPoll) return;
    const interval = setInterval(() => { fetchData(true); }, 30_000);
    return () => clearInterval(interval);
  }, [autoPoll, fetchData]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin h-8 w-8 border-2 border-[#9b83a0] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <Button variant="outline" className="mt-3" onClick={() => fetchData()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => fetchData()}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={autoPoll ? "text-green-400" : "text-muted-foreground"}
          onClick={() => setAutoPoll((p) => !p)}
        >
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
              autoPoll ? "bg-green-500" : "bg-zinc-500"
            }`}
          />
          {autoPoll ? "Live" : "Paused"}
        </Button>
      </div>

      <PlatformIdCoverageSection
        coverage={data.platformIdCoverage}
        totalWithSpotify={data.totalWithSpotify}
      />

      <ArtistLinkCoverageSection
        coverage={data.artistLinkCoverage}
        totalArtists={data.totalArtists}
      />

      <CompletenessSection
        distribution={data.completenessDistribution}
        median={data.medianFields}
        average={data.averageFields}
        totalArtists={data.totalArtists}
      />

      <EnrichmentReadinessSection readiness={data.enrichmentReadiness} />
    </div>
  );
}
