// @ts-nocheck
jest.mock("@/server/auth", () => ({ getServerAuthSession: jest.fn() }));
jest.mock("@/server/utils/artistEditAuth", () => ({
  canEditArtist: jest.fn(),
}));
jest.mock("@/server/utils/queries/lorePersistence", () => ({
  getLoreClaimGeneration: jest.fn().mockResolvedValue("claim"),
}));
jest.mock("@/server/utils/latest/requestLatestRefresh", () => ({
  requestLatestRefresh: jest.fn().mockResolvedValue("job"),
}));
jest.mock("@/server/utils/latest/getLatestRefresh", () => ({
  getLatestRefresh: jest.fn().mockResolvedValue({ id: "job" }),
}));
import { GET, POST } from "../route";
import { getServerAuthSession } from "@/server/auth";
import { canEditArtist } from "@/server/utils/artistEditAuth";
import { requestLatestRefresh } from "@/server/utils/latest/requestLatestRefresh";
import { getActiveArtistOperation } from "@/server/utils/artistOperationContext";
if (!("json" in Response))
  Response.json = (body, init) =>
    new Response(JSON.stringify(body), {
      ...init,
      headers: { ...init?.headers, "Content-Type": "application/json" },
    });
const params = {
  params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000001" }),
};
beforeEach(() => {
  jest.clearAllMocks();
  getServerAuthSession.mockResolvedValue({ user: { id: "owner" } });
  canEditArtist.mockResolvedValue(true);
});
it("rejects anonymous requests before starting any job", async () => {
  getServerAuthSession.mockResolvedValue(null);
  expect((await POST(new Request("http://localhost"), params)).status).toBe(
    401,
  );
  expect(requestLatestRefresh).not.toHaveBeenCalled();
});
it("rejects an authenticated non-editor", async () => {
  canEditArtist.mockResolvedValue(false);
  expect((await POST(new Request("http://localhost"), params)).status).toBe(
    403,
  );
  expect(requestLatestRefresh).not.toHaveBeenCalled();
});
it("carries the authenticated actor and claim; ignores forged client actor data", async () => {
  requestLatestRefresh.mockImplementation(async () => {
    expect(getActiveArtistOperation()).toMatchObject({
      userId: "owner",
      expectedClaimId: "claim",
      trigger: "manual_latest_refresh",
    });
  });
  expect(
    (
      await POST(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({ userId: "forged" }),
        }),
        params,
      )
    ).status,
  ).toBe(200);
});
it("GET only reads status and is private/no-store", async () => {
  const response = await GET(new Request("http://localhost"), params);
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(requestLatestRefresh).not.toHaveBeenCalled();
});
