/** @jest-environment node */
import { GET } from "../route";
import { getServerAuthSession } from "@/server/auth";
import { getDirectoryDiscoveryStatus } from "@/server/utils/directoryDiscovery/getDirectoryDiscoveryStatus";
jest.mock("@/server/auth", () => ({ getServerAuthSession: jest.fn() }));
jest.mock(
  "@/server/utils/directoryDiscovery/getDirectoryDiscoveryStatus",
  () => ({ getDirectoryDiscoveryStatus: jest.fn() }),
);
beforeAll(() => {
  Response.json = (body, init) =>
    new Response(JSON.stringify(body), {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
});
const session = jest.mocked(getServerAuthSession);
const status = jest.mocked(getDirectoryDiscoveryStatus);
const id = "00000000-0000-4000-8000-000000000001";
const get = () =>
  GET(new Request("https://musicnerd.test"), {
    params: Promise.resolve({ id }),
  });
beforeEach(() => {
  session.mockReset();
  status.mockReset();
});
it("rejects anonymous reads without looking up private operations", async () => {
  session.mockResolvedValue(null);
  expect((await get()).status).toBe(401);
  expect(status).not.toHaveBeenCalled();
});
it("returns no operation details for another user or an expired creation", async () => {
  session.mockResolvedValue({ user: { id: "other" } } as never);
  status.mockResolvedValue(null);
  expect((await get()).status).toBe(404);
});
it("returns a private no-store public fingerprint for the authorized account", async () => {
  session.mockResolvedValue({ user: { id: "adder" } } as never);
  status.mockResolvedValue({ state: "active", revision: "hash" });
  const response = await get();
  expect(await response.json()).toEqual({ state: "active", revision: "hash" });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(status).toHaveBeenCalledWith(id, "adder");
});
it("returns unavailable, not complete, after a failed status read", async () => {
  session.mockResolvedValue({ user: { id: "adder" } } as never);
  status.mockRejectedValue(new Error("private DB details"));
  const response = await get();
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private DB");
});
