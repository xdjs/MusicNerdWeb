import { preservePublicResearchScope } from "../preservePublicResearchScope";

it("preserves the named identity and credit relationship from declared public scope", () => {
  expect(preservePublicResearchScope(
    "Production credits for Oriel Loom's 2022 album Folded Coast",
    ["Bellwater trio", "whether Pax Cedar produced Folded Coast"],
  )).toBe("Production credits for Oriel Loom's 2022 album Folded Coast; Bellwater trio; whether Pax Cedar produced Folded Coast");
});

it("keeps arbitrary follow-up exclusions and editions without an entity phrase list", () => {
  expect(preservePublicResearchScope("Mira Vale recording credits", [
    "original French-language edition", "exclude the concert film", "Ivo Reed's arranging role",
  ])).toBe("Mira Vale recording credits; original French-language edition; exclude the concert film; Ivo Reed's arranging role");
});

it("does not repeat already present constraints or repeated declarations", () => {
  expect(preservePublicResearchScope("Aster Ferry original edition credits", [
    "original edition", "ASTER   FERRY", "producer: Ari Moss", "Producer: Ari Moss",
  ])).toBe("Aster Ferry original edition credits; producer: Ari Moss");
});

it("does not confuse a substring with a complete named constraint", () => {
  expect(preservePublicResearchScope("Annette production credits", ["Ann"]))
    .toBe("Annette production credits; Ann");
});

it("preserves meaningful punctuation in a distinct name", () => {
  expect(preservePublicResearchScope("ACDC recording credits", ["AC/DC"]))
    .toBe("ACDC recording credits; AC/DC");
});

it("returns no topic rather than truncating constraints at the API limit", () => {
  expect(preservePublicResearchScope("x".repeat(160), [])).toBe("x".repeat(160));
  expect(preservePublicResearchScope("x".repeat(150), ["original edition"]))
    .toBeNull();
  expect(preservePublicResearchScope("x".repeat(161), [])).toBeNull();
});
