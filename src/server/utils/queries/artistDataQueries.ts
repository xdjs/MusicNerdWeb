/**
 * Types for the Artist Data admin tab. MusicNerdAPI serves the data
 * (`GET /api/admin/artist-data`); these describe its summary.
 */

// --- Types ---

type Category = "social" | "listen" | "reference" | "content";

export interface PlatformIdCoverageItem {
  platform: string;
  count: number;
  percentage: number;
  todayCount: number;
}

export interface ArtistLinkCoverageItem {
  column: string;
  category: Category;
  count: number;
  percentage: number;
  todayCount: number;
}

export interface CompletenessBucket {
  bucket: string;
  count: number;
  percentage: number;
}

export interface EnrichmentReadiness {
  hasWikidata: number;
  hasSpotifyNoWikidata: number;
  noSpotify: number;
}

export interface ArtistDataSummary {
  totalArtists: number;
  totalWithSpotify: number;
  platformIdCoverage: PlatformIdCoverageItem[];
  artistLinkCoverage: ArtistLinkCoverageItem[];
  completenessDistribution: CompletenessBucket[];
  medianFields: number;
  averageFields: number;
  enrichmentReadiness: EnrichmentReadiness;
}
