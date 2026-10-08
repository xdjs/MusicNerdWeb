type Step = { toolResults: Array<{ toolName: string; output: unknown }> };
/** Search snippets and source titles cannot complete research without a subsequent original read. */
export function selectInterviewToolChoice(steps: Step[]) {
  let needsRead = false,
    needsProof = false,
    hasProof = false;
  for (const step of steps)
    for (const result of step.toolResults) {
      const output = result.output;
      if (!output || typeof output !== "object") continue;
      if (
        result.toolName === "searchArtistKnowledge" &&
        "passages" in output &&
        Array.isArray(output.passages) &&
        output.passages.length
      )
        needsRead = true;
      if (
        result.toolName === "listArtistSources" &&
        "sources" in output &&
        Array.isArray(output.sources) &&
        output.sources.some(
          (source) => source?.extraction?.readiness === "ready",
        )
      )
        needsRead = true;
      if (
        result.toolName === "readArtistSource" &&
        "passage" in output &&
        output.passage &&
        typeof output.passage === "object" &&
        "text" in output.passage &&
        typeof output.passage.text === "string" &&
        output.passage.text.length
      ) {
        needsRead = false;
        needsProof = true;
      }
      if (
        result.toolName === "checkInterviewEvidence" &&
        "valid" in output &&
        output.valid === true
      ) {
        hasProof = true;
        needsProof = false;
      }
    }
  return needsRead
    ? {
        toolChoice: {
          type: "tool" as const,
          toolName: "readArtistSource" as const,
        },
      }
    : needsProof
      ? {
          toolChoice: {
            type: "tool" as const,
            toolName: "checkInterviewEvidence" as const,
          },
        }
      : hasProof
        ? steps.length >= 7
          ? { toolChoice: "none" as const }
          : undefined
        : { toolChoice: "required" as const };
}
