const stages = new Set([
  "read_original", "fetch_original", "validate_original", "draft",
  "quote_check", "claim_check", "store_result",
]);
const verificationCodes = new Set(["original_mismatch", "quote_rejected", "claim_rejected"]);
const errorNames = new Set([
  "AbortError", "TimeoutError", "ZodError", "AI_NoObjectGeneratedError",
  "AI_NoOutputGeneratedError", "TypeError", "SyntaxError",
]);
const finishReasons = new Set(["stop", "length", "content-filter", "tool-calls", "error", "other", "unknown"]);

/** Select metadata only; never stringify errors, causes, model output or provider bodies. */
export function getResearchFailureDiagnostic(error: unknown, fallbackStage = "store_result") {
  const e = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const rawStatus = e.status ?? e.statusCode;
  const status = typeof rawStatus === "number" && Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus <= 599 ? rawStatus : null;
  const stage = typeof e.verificationStage === "string" && stages.has(e.verificationStage)
    ? e.verificationStage : stages.has(fallbackStage) ? fallbackStage : "store_result";
  const category = typeof e.verificationCode === "string" && verificationCodes.has(e.verificationCode)
    ? e.verificationCode
    : error instanceof Error && errorNames.has(error.name) ? error.name
    : status !== null ? "provider_error" : "operation_failed";
  const finishReason = typeof e.finishReason === "string" && finishReasons.has(e.finishReason) ? e.finishReason : null;
  return { stage, category, status, finishReason };
}
