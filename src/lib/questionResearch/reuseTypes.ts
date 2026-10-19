/** Only public neutral descriptors and already verified public answers. */
import type { z } from "zod";
import type { evidenceFacetSchema } from "./schemas";
export type EvidenceFacet = z.infer<typeof evidenceFacetSchema>;
export type QuestionReuseCandidate = {
  id: string;
  jobId: string;
  questionHash: string;
  intent: string;
  routing: Record<string, string | string[] | EvidenceFacet[] | null>;
  answer: string;
  passages: { text: string; url: string; evidenceKind: string }[];
};
