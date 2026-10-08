/** @jest-environment node */
import { db } from "@/server/db/drizzle";
import { registerResearchQuestion } from "../registerResearchQuestion";

jest.mock("@/server/db/drizzle", () => ({ db: { transaction: jest.fn() } }));
Object.assign(db, { transaction: jest.fn() });
const artist = "11111111-1111-4111-8111-111111111111";
const job = "22222222-2222-4222-8222-222222222222";
it("registers the exact question digest under a job lock before acknowledging it", async () => {
  const execute = jest.fn()
    .mockResolvedValueOnce([]) // advisory transaction lock
    .mockResolvedValueOnce([]) // expiry cleanup
    .mockResolvedValueOnce([]) // unknown question
    .mockResolvedValueOnce([{ n: 2 }])
    .mockResolvedValueOnce([{ job_id: job }]);
  jest.mocked(db.transaction).mockImplementation(async fn => fn({ execute } as never));
  expect(await registerResearchQuestion(artist, job, "Who played drums?")).toBe(true);
  expect(execute).toHaveBeenCalledTimes(5);
});
it("stops a fourth distinct question before any insert or model draft", async () => {
  const execute = jest.fn()
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ n: 3 }]);
  jest.mocked(db.transaction).mockImplementation(async fn => fn({ execute } as never));
  expect(await registerResearchQuestion(artist, job, "A fourth question?")).toBe(false);
  expect(execute).toHaveBeenCalledTimes(4);
});
