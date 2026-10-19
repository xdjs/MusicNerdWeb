import { evidenceFacetsSchema } from "../schemas";

it("requires ordered canonical IDs and distinct intents after API-aligned normalization", () => {
  expect(evidenceFacetsSchema.safeParse([
    { id: "f1", intent: "Compare the two editions" },
    { id: "f2", intent: " compare   the two editions " },
  ]).success).toBe(false);
  expect(evidenceFacetsSchema.safeParse([
    { id: "f2", intent: "Ann's production role" },
    { id: "f1", intent: "Annette's production role" },
  ]).success).toBe(false);
  expect(evidenceFacetsSchema.safeParse([
    { id: "f1", intent: "Ann's production role" },
    { id: "f2", intent: "Annette's production role" },
  ]).success).toBe(true);
});
