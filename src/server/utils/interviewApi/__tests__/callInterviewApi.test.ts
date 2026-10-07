/** @jest-environment node */
import { callInterviewApi } from "../callInterviewApi";
import { ReadableStream } from "node:stream/web";
const id = "11111111-1111-4111-8111-111111111111";
const token = jest.fn(async () => "private-token");
const config = {
  apiOrigin: "https://api.example",
  artistId: id,
  getAccessToken: token,
};
const reply = (value: unknown) => ({
  ok: true,
  status: 200,
  body: new ReadableStream({
    start(c) {
      c.enqueue(Buffer.from(JSON.stringify(value)));
      c.close();
    },
  }),
});
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue(reply({ status: "ok" }));
});
it("rejects untrusted origins and paths before obtaining a credential", async () => {
  await expect(
    callInterviewApi(
      { ...config, apiOrigin: "https://other.example/path" },
      "session",
    ),
  ).rejects.toThrow();
  await expect(callInterviewApi(config, "../knowledge")).rejects.toThrow();
  expect(token).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});
it("uses only scoped authenticated no-store reads without redirects", async () => {
  expect(await callInterviewApi(config, "session")).toEqual({ status: "ok" });
  expect(fetch).toHaveBeenCalledWith(
    new URL(`https://api.example/api/artist/${id}/interview/session`),
    expect.objectContaining({
      method: "GET",
      redirect: "error",
      cache: "no-store",
      headers: {
        Authorization: "Bearer private-token",
        "Content-Type": "application/json",
      },
    }),
  );
});
it("preserves a safe stale-state error without exposing provider details", async () => {
  global.fetch = jest
    .fn()
    .mockResolvedValue({
      ...reply({ secret: "PRIVATE" }),
      ok: false,
      status: 409,
    });
  await expect(callInterviewApi(config, "session")).rejects.toMatchObject({
    status: 409,
  });
});
