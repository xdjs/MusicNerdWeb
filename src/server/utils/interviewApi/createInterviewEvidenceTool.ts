import { tool } from "ai";
import { z } from "zod";
import { interviewAnchorSchema } from "@/lib/interviewApi/interviewPlanSchemas";
import { resolveInterviewAnchors } from "@/lib/interviewApi/resolveInterviewAnchors";
import type { KnowledgeResults, MemoryEntry } from "@/lib/interviewApi/types";
/** Local proof tool: exact references can be repaired within the bounded research loop, with no network call. */
export function createInterviewEvidenceTool(context: {
  memory: { entries: MemoryEntry[] };
  originals: KnowledgeResults["read"][];
  history: KnowledgeResults["history"][];
  diagnostics?: { returnedChars: number };
}) {
  const validated = new Set<string>();
  return {
    validated,
    tool: tool({
      description:
        "Check every supporting quote before the final angle plan. This local tool validates full source/answer ids and revisions against originals already opened or complete permitted answers. Copy references from a valid result. If invalid, correct the quote/id from the opened original or read the proper source; never paraphrase or splice quotations. This tool does not decide editorial merit or override topic instructions.",
      inputSchema: z.object({
        references: z.array(interviewAnchorSchema).min(1).max(3),
      }),
      execute: async ({ references }) => {
        let result;
        try {
          const resolved = resolveInterviewAnchors(
            references,
            context.originals,
            context.memory,
            context.history,
          ).map((e) => e.reference);
          result = { valid: true as const, references: resolved };
        } catch {
          result = {
            valid: false as const,
            error:
              "The reference does not resolve uniquely to an opened original or complete permitted answer. Check full ids/revisions and copy a short contiguous quote, including its exact words. Corrections and boundaries are not answer references.",
          };
        }
        if (context.diagnostics) {
          const size = JSON.stringify(result).length;
          if (context.diagnostics.returnedChars + size > 48000)
            throw new Error(
              "Interview evidence response exceeds its context budget",
            );
          context.diagnostics.returnedChars += size;
        }
        if (result.valid)
          for (const ref of result.references)
            validated.add(JSON.stringify(ref));
        return result;
      },
    }),
  };
}
