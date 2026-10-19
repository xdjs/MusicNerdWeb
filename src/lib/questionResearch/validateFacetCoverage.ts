import { evidenceFacetsSchema, facetCoverageSchema } from "./schemas";

export type FacetCoverageValidation = {
  known: boolean;
  rows: { id: string; referenceIndexes: number[] }[];
};

/** API routing is advisory, but malformed or mismatched partitions are never trusted. */
export function validateFacetCoverage(
  rawFacets: unknown,
  rawCoverage: unknown,
  referenceCount: number,
): FacetCoverageValidation | null {
  const facets = evidenceFacetsSchema.safeParse(rawFacets);
  if (!facets.success || !Number.isInteger(referenceCount) || referenceCount < 0) return null;
  if (rawCoverage === undefined) return {
    known: false,
    rows: facets.data.map(facet => ({ id: facet.id, referenceIndexes: [] })),
  };
  const coverage = facetCoverageSchema.safeParse(rawCoverage);
  if (!coverage.success || coverage.data.length !== facets.data.length) return null;
  const rows = coverage.data.map((row, index) => ({
    id: row.id,
    referenceIndexes: row.referenceIndexes,
  }));
  if (rows.some((row, index) => row.id !== facets.data[index]?.id
    || row.referenceIndexes.some(refIndex => refIndex >= referenceCount))) return null;
  return { known: true, rows };
}
