import { getResearchFailureDiagnostic } from "../getResearchFailureDiagnostic";

it.each(["original_mismatch", "quote_rejected", "claim_rejected"])("keeps explicit verification category %s", verificationCode => {
  expect(getResearchFailureDiagnostic({ verificationCode, verificationStage: "claim_check", message: "PRIVATE" })).toEqual({ stage: "claim_check", category: verificationCode, status: null, finishReason: null });
});
it.each(["ZodError", "AI_NoObjectGeneratedError", "AI_NoOutputGeneratedError", "TimeoutError", "AbortError"])("distinguishes %s without retaining its message", name => {
  expect(getResearchFailureDiagnostic(Object.assign(new Error("PRIVATE"), { name }), "draft")).toEqual({ stage: "draft", category: name, status: null, finishReason: null });
});
it("bounds provider metadata and discards all unknown/private fields", () => {
  expect(getResearchFailureDiagnostic({ statusCode: 429, finishReason: "length", verificationStage: "draft", body: "PRIVATE", cause: "PRIVATE" })).toEqual({ stage: "draft", category: "provider_error", status: 429, finishReason: "length" });
  for (const error of [null, "PRIVATE", { status: 999, verificationStage: "PRIVATE", verificationCode: "PRIVATE", finishReason: "PRIVATE" }, new Error("PRIVATE")]) {
    expect(getResearchFailureDiagnostic(error)).toEqual({ stage: "store_result", category: "operation_failed", status: null, finishReason: null });
  }
});

it("recognizes the evidence API revision-conflict response only at the original-read stage", () => {
  expect(getResearchFailureDiagnostic({ status: 409, verificationStage: "fetch_original" }).category).toBe("original_mismatch");
  expect(getResearchFailureDiagnostic({ status: 409, verificationStage: "draft" }).category).toBe("provider_error");
});
