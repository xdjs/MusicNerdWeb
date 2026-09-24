import { buildDocSources, generateLoreSummary, type DocRefresh } from "@/server/utils/artistDocService";
import { synthesizeArtistDoc } from "@/server/utils/artistDoc/synthesizeArtistDoc";
import { getArtistDoc } from "@/server/utils/queries/onboardingQueries";
import { getLoreClaimGeneration, persistRefreshedLore } from "@/server/utils/queries/lorePersistence";

export async function refreshArtistDoc(artistId: string, options: { createIfMissing?: boolean; jobId?: string; expectedClaimId?: string | null } = {}): Promise<DocRefresh> {
    try {
        const claimId = options.expectedClaimId !== undefined ? options.expectedClaimId : await getLoreClaimGeneration(artistId);
        if (!options.createIfMissing && !(await getArtistDoc(artistId))) return "no-document";
        const sources = await buildDocSources(artistId);
        const [doc, summary] = await Promise.all([synthesizeArtistDoc(artistId, sources), generateLoreSummary(artistId)]);
        if (!(await persistRefreshedLore(artistId, doc, sources, claimId, options.jobId, summary))) return 'cancelled';
        console.log(`[refreshArtistDoc] Rebuilt doc for ${artistId} from ${sources.length} sources`);
        return "rebuilt";
    } catch (e) {
        console.error("[refreshArtistDoc] Failed:", e);
        return "failed";
    }
}
