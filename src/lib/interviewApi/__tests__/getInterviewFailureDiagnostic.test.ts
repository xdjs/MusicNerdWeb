import { getInterviewFailureDiagnostic } from "../getInterviewFailureDiagnostic";

it.each([
  [
    "Mandatory memory request cancelled or timed out",
    "memory",
    "timeout_or_cancelled",
  ],
  ["Interview original-context budget exhausted", "research", "context_limit"],
  ["Interview check exceeds its context budget", "check", "context_limit"],
  ["Interview quote is missing or ambiguous", "research", "evidence_invalid"],
  [
    "Interview references were not checked before angle selection",
    "research",
    "evidence_invalid",
  ],
  [
    "Interview memory changed; prepare a fresh question",
    "memory_recheck",
    "memory_changed",
  ],
  ["Mandatory interview memory is incomplete", "memory", "memory_incomplete"],
  [
    "Interview question did not pass its evidence and conversation check",
    "check",
    "question_rejected",
  ],
  ["Music Nerd request failed", "question_index", "api_unavailable"],
  ["Not signed in to Music Nerd", "memory", "unauthenticated"],
  ["Invalid Music Nerd API scope", "memory", "invalid_scope"],
])(
  "classifies the known %s failure without retaining its message",
  (message, stage, category) => {
    expect(
      getInterviewFailureDiagnostic(new Error(message), stage, 1200),
    ).toEqual({
      stage,
      category,
      elapsedMs: 1200,
    });
  },
);

it.each([
  ["AbortError", "timeout_or_cancelled"],
  ["TimeoutError", "timeout_or_cancelled"],
  ["AI_NoObjectGeneratedError", "model_output_invalid"],
  ["AI_NoOutputGeneratedError", "model_output_invalid"],
  ["AI_APICallError", "provider_error"],
  ["AI_LoadAPIKeyError", "provider_error"],
  ["GatewayAuthenticationError", "provider_error"],
  ["GatewayRateLimitError", "provider_error"],
  ["GatewayTimeoutError", "timeout_or_cancelled"],
  ["ZodError", "schema_invalid"],
])(
  "maps only the allowlisted %s name to a fixed category",
  (name, category) => {
    const error = Object.assign(
      new Error("private-source https://secret.invalid token=abc"),
      {
        name,
        cause: { responseBody: "private provider response" },
        stack: "private stack",
      },
    );
    expect(getInterviewFailureDiagnostic(error, "draft", 2401)).toEqual({
      stage: "draft",
      category,
      elapsedMs: 2401,
    });
  },
);

it.each([
  [401, "unauthenticated"],
  [409, "memory_changed"],
  [413, "context_limit"],
  [503, "api_unavailable"],
])(
  "maps the exact known memory HTTP %s message without logging it",
  (status, category) => {
    expect(
      getInterviewFailureDiagnostic(
        new Error(
          `Mandatory memory API returned HTTP ${status}; restart after 409, sign in after 401`,
        ),
        "memory",
        52,
      ),
    ).toEqual({
      stage: "memory",
      category,
      elapsedMs: 52,
    });
  },
);

it("drops arbitrary error names, messages, extra properties and stages", () => {
  const error = Object.assign(
    new Error("private question transcript and credentials"),
    {
      name: "PrivateArtistError",
      artistId: "private-artist-id",
      config: { url: "https://private.invalid", token: "private-token" },
      generatedText: "private draft",
      cause: new Error("private cause"),
    },
  );
  expect(getInterviewFailureDiagnostic(error, "private-stage", 88)).toEqual({
    stage: "unknown",
    category: "unknown",
    elapsedMs: 88,
  });
});

it.each(["constructor", "__proto__", "toString"])(
  "does not treat object prototype key %s as a category",
  (message) => {
    expect(
      getInterviewFailureDiagnostic(new Error(message), "check", 1).category,
    ).toBe("unknown");
  },
);

it("normalizes a private evaluation research-step stage to research", () => {
  expect(
    getInterviewFailureDiagnostic(new Error("private"), "research_step", 52),
  ).toEqual({
    stage: "research",
    category: "unknown",
    elapsedMs: 52,
  });
});

it("requires the whole known host message instead of accepting an unsafe prefix", () => {
  expect(
    getInterviewFailureDiagnostic(
      new Error("Interview quote is missing or ambiguous: secret"),
      "research",
      9,
    ).category,
  ).toBe("unknown");
});

it("does not serialize arbitrary thrown values", () => {
  expect(
    getInterviewFailureDiagnostic(
      { private: "source text", toString: () => "secret" },
      "draft",
      9,
    ),
  ).toEqual({
    stage: "draft",
    category: "unknown",
    elapsedMs: 9,
  });
});

it("does not mask a failure whose error fields throw on inspection", () => {
  const error = new Error("private");
  Object.defineProperty(error, "message", {
    get: () => {
      throw new Error("private getter");
    },
  });
  expect(getInterviewFailureDiagnostic(error, "research", 4)).toEqual({
    stage: "research",
    category: "unknown",
    elapsedMs: 4,
  });
});

it.each([NaN, Infinity, -12])(
  "normalizes invalid elapsed time %s",
  (elapsedMs) => {
    expect(
      getInterviewFailureDiagnostic(new Error("private"), "check", elapsedMs)
        .elapsedMs,
    ).toBe(0);
  },
);
