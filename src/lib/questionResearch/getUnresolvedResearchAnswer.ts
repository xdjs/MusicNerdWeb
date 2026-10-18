import type { ResearchStatus } from "./schemas";

/** Explain trusted capability/status reasons without generating unsupported source claims. */
export function getUnresolvedResearchAnswer(
  state: Pick<ResearchStatus, "outsideResearchReason" | "limitations">,
): string {
  if (state.outsideResearchReason === "quota")
    return "The saved sources I checked did not answer that. Outside research is at its limit for now. You can still ask about saved sources.";
  if (state.limitations.includes("provider_latest_refresh_required"))
    return "I don't have enough saved information from that source, and I can't refresh it from this chat yet.";
  if (state.limitations.includes("connected_account_required"))
    return "I need a connected account for that source before I can check it.";
  if (state.limitations.includes("unsupported_speech"))
    return "I couldn't establish what was said from the saved sources, and I can't transcribe speech from this source.";
  return "I don't have enough information to answer that yet.";
}
