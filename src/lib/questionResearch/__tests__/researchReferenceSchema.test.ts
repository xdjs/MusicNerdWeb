import { referenceSchema } from "../schemas";
const reference = {
  sourceId: "public_answer:11111111-1111-4111-8111-111111111111",
  revision: "a".repeat(64), start: 0, end: 10, text: "An answer.",
  url: "https://musicnerd.net/artist/22222222-2222-4222-8222-222222222222",
  curation: "approved", evidenceKind: "original_text", speaker: "unverified",
  publishedAt: "2026-10-09", retrievedAt: null, truncated: false,
};
it("accepts an API-authorized published answer as an exact public original", () => {
  expect(referenceSchema.safeParse(reference).success).toBe(true);
});
it.each(["private_answer", "interview", "memory"])("does not introduce private %s evidence references", (prefix) => {
  expect(referenceSchema.safeParse({ ...reference, sourceId: reference.sourceId.replace("public_answer", prefix) }).success).toBe(false);
});
