import { db } from "@/server/db/drizzle";
import { getPendingLoreSources } from "../getPendingLoreSources";

jest.mock("@/server/db/drizzle", () => ({ db: { select: jest.fn() } }));

it("reaches pages beyond 1000 when the pending queue has more than 25,000 rows", async () => {
  const offset = jest.fn().mockResolvedValue([]);
  (db.select as jest.Mock)
    .mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([{ total: 25026 }]) }) })
    .mockReturnValueOnce({ from: () => ({ innerJoin: () => ({ where: () => ({ orderBy: () => ({ limit: () => ({ offset }) }) }) }) }) });

  const result = await getPendingLoreSources({ page: 1001 });

  expect(offset).toHaveBeenCalledWith(25000);
  expect(result.page).toBe(1001);
  expect(result.pendingTotal).toBe(25026);
});
