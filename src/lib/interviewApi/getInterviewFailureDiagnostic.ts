const stages = [
  "memory",
  "question_index",
  "research",
  "draft",
  "check",
  "memory_recheck",
] as const;

type Category =
  | "timeout_or_cancelled"
  | "model_output_invalid"
  | "provider_error"
  | "schema_invalid"
  | "context_limit"
  | "evidence_invalid"
  | "memory_changed"
  | "memory_incomplete"
  | "question_rejected"
  | "api_unavailable"
  | "unauthenticated"
  | "invalid_scope"
  | "unknown";

const messages = new Map<string, Category>([
  ...[
    "Mandatory memory request cancelled or timed out",
    "Music Nerd request cancelled or timed out",
  ].map((message) => [message, "timeout_or_cancelled"] as const),
  ...[
    "Mandatory memory exceeds its page budget",
    "Mandatory memory response exceeds its byte budget",
    "Mandatory memory exceeds its context budget",
    "Prior interview history exceeds its page budget",
    "Prior interview history exceeds its response budget",
    "Prior questions exceed their model context budget",
    "Interview API call budget exhausted",
    "Interview original-context budget exhausted",
    "Interview evidence response exceeds its context budget",
    "Interview check exceeds its context budget",
    "Music Nerd API response exceeds its byte budget",
  ].map((message) => [message, "context_limit"] as const),
  ...[
    "Interview quote is missing or ambiguous",
    "Interview evidence offsets do not match",
    "Interview evidence was not read in its original context",
    "Interview answer evidence is missing or incomplete",
    "Interview references were not checked before angle selection",
    "Interview angle selection is invalid",
    "Original reference mismatch",
  ].map((message) => [message, "evidence_invalid"] as const),
  ...[
    "Interview memory changed; prepare a fresh question",
    "Mandatory memory sitting changed",
    "Mandatory memory changed; restart the read",
    "Mandatory memory record changed",
    "Interview history changed while reading",
    "Interview history record changed while reading",
    "Interview history field changed while reading",
  ].map((message) => [message, "memory_changed"] as const),
  ...[
    "Mandatory interview memory is incomplete",
    "Mandatory memory is incomplete",
    "Mandatory memory fields are incomplete",
    "Mandatory memory has a gap",
    "Mandatory memory has a gap or invalid field",
    "Mandatory memory budget is inconsistent",
    "Latest exact answer is missing",
    "Prior interview question is incomplete or changed",
    "Prior interview questions are incomplete",
    "Interview history field is invalid",
    "Interview history fragments conflict",
  ].map((message) => [message, "memory_incomplete"] as const),
  ...[
    "Interview question did not pass its evidence and conversation check",
    "Mechanical rejection: question repeats a prior ask or contains multiple questions. Other dimensions have not been assessed; the revision still needs the full evidence and conversation check.",
  ].map((message) => [message, "question_rejected"] as const),
  ...[
    "Music Nerd request failed",
    "Mandatory memory response unavailable",
    "Invalid Music Nerd API response",
    "Invalid Music Nerd API response: source version metadata is missing",
  ].map((message) => [message, "api_unavailable"] as const),
  ["Not signed in to Music Nerd", "unauthenticated"],
  ...[
    "Invalid Music Nerd memory scope",
    "Invalid Music Nerd memory deadline",
    "Invalid Music Nerd API scope",
    "Invalid Music Nerd API deadline",
    "Invalid Music Nerd tool input",
  ].map((message) => [message, "invalid_scope"] as const),
]);

// Match complete host-authored HTTP messages, never arbitrary response text.
for (const status of [400, 401, 403, 404, 409, 413, 429, 500, 502, 503, 504]) {
  const category =
    status === 401
      ? "unauthenticated"
      : status === 413
        ? "context_limit"
        : status === 409
          ? "memory_changed"
          : "api_unavailable";
  messages.set(
    `Mandatory memory API returned HTTP ${status}; restart after 409, sign in after 401`,
    category,
  );
  messages.set(
    `Music Nerd API returned HTTP ${status}; reload current evidence after 409, sign in after 401, and do not treat failures as empty knowledge`,
    status === 409 ? "evidence_invalid" : category,
  );
}

const names = new Map<string, Category>([
  ["AbortError", "timeout_or_cancelled"],
  ["TimeoutError", "timeout_or_cancelled"],
  ["AI_NoObjectGeneratedError", "model_output_invalid"],
  ["AI_NoOutputGeneratedError", "model_output_invalid"],
  ["AI_TypeValidationError", "model_output_invalid"],
  ["AI_JSONParseError", "model_output_invalid"],
  ["AI_InvalidToolInputError", "model_output_invalid"],
  ["AI_APICallError", "provider_error"],
  ["AI_LoadAPIKeyError", "provider_error"],
  ["AI_StreamProviderError", "provider_error"],
  ["AI_RetryError", "provider_error"],
  ["GatewayTimeoutError", "timeout_or_cancelled"],
  ...[
    "GatewayAuthenticationError",
    "GatewayForbiddenError",
    "GatewayRateLimitError",
    "GatewayModelNotFoundError",
    "GatewayInvalidRequestError",
    "GatewayResponseError",
    "GatewayNotFoundError",
    "GatewayFailedDependencyError",
    "GatewayInternalServerError",
  ].map((name) => [name, "provider_error"] as const),
  ["ZodError", "schema_invalid"],
  ["SyntaxError", "schema_invalid"],
]);

/** Safe operational metadata only; never return error text, names, causes or identities. */
export function getInterviewFailureDiagnostic(
  error: unknown,
  stage: string,
  elapsedMs: number,
) {
  let category: Category = "unknown";
  try {
    if (error instanceof Error)
      category =
        messages.get(error.message) ?? names.get(error.name) ?? "unknown";
  } catch {
    // An error with unsafe property getters must not mask the original failure.
  }
  return {
    stage:
      stages.find(
        (candidate) =>
          candidate === (stage === "research_step" ? "research" : stage),
      ) ?? "unknown",
    category,
    elapsedMs: Number.isFinite(elapsedMs)
      ? Math.max(0, Math.round(elapsedMs))
      : 0,
  };
}
