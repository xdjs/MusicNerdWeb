/** The production Supabase project ref, as `scripts/research-benchmark.ts` names it. */
const PROD_REF = "cbabvmebugudeuylronz";

/** True when a connection string points at production. The research suite resets
 *  artist state and must never run there; previews, staging and local all use the
 *  staging database (docs/evals.md). */
export function isProductionDatabase(connectionString: string | undefined): boolean {
    return (connectionString ?? "").includes(PROD_REF);
}
