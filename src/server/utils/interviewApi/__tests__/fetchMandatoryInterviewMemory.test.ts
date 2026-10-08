/** @jest-environment node */
import { fetchMandatoryInterviewMemory } from "../fetchMandatoryInterviewMemory";
const config = {
  apiOrigin: "https://api.example",
  artistId: "11111111-1111-4111-8111-111111111111",
  getAccessToken: async () => "private-token",
};
const originalFetch = global.fetch;
function response(data: unknown, init: { status?: number } = {}) {
  const status = init.status ?? 200;
  return {
    status,
    ok: status >= 200 && status < 300,
    body: new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode(JSON.stringify(data)));
        c.close();
      },
    }),
  } as Response;
}

afterEach(() => {
  global.fetch = originalFetch;
});
const revision = "a".repeat(64);
function page(text: string, start = 0, nextCursor: string | null = null) {
  return {
    status: "ok",
    snapshotId: revision,
    sitting: 1,
    latestAnswer: { entryId: "answer:1", revision },
    totalEntries: 1,
    entries: [
      {
        entryId: "answer:1",
        revision,
        kind: "latest_answer",
        metadata: { questionKey: "q" },
        fields: [
          ...(start === 0
            ? [
                {
                  name: "question",
                  text: "Why?",
                  start: 0,
                  end: 4,
                  totalChars: 4,
                  complete: true,
                },
              ]
            : []),
          {
            name: "answer",
            text,
            start,
            end: start + text.length,
            totalChars: 8,
            complete: start + text.length === 8,
          },
        ],
      },
    ],
    constraintsComplete: nextCursor === null,
    budget: { returnedChars: text.length + (start === 0 ? 4 : 0), nextCursor },
  };
}
it("restores exact latest words across pages before allowing a model call", async () => {
  const fetch = jest
    .fn()
    .mockResolvedValueOnce(response(page("Exact", 0, "continuation")))
    .mockResolvedValueOnce(response(page(" 🥁", 5)));
  global.fetch = fetch;
  const result = await fetchMandatoryInterviewMemory(config, 1);
  expect(result.entries[0].fields.find((f) => f.name === "answer")?.text).toBe(
    "Exact 🥁",
  );
  expect(result.constraintsComplete).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[0][1]).toMatchObject({
    headers: { Authorization: "Bearer private-token" },
    cache: "no-store",
    redirect: "error",
  });
});
it("rejects incomplete or changed memory instead of replacing it with an empty history", async () => {
  global.fetch = jest.fn().mockResolvedValue(response(page("Exact", 0, null)));
  await expect(fetchMandatoryInterviewMemory(config, 1)).rejects.toThrow(
    /incomplete/,
  );
  global.fetch = jest
    .fn()
    .mockResolvedValue(response({ status: "error" }, { status: 409 }));
  await expect(fetchMandatoryInterviewMemory(config, 1)).rejects.toThrow(/409/);
});
it("validates scope before requesting a credential", async () => {
  const getAccessToken = jest.fn();
  await expect(
    fetchMandatoryInterviewMemory(
      { ...config, apiOrigin: "https://api.example/other", getAccessToken },
      1,
    ),
  ).rejects.toThrow();
  expect(getAccessToken).not.toHaveBeenCalled();
});
it("bounds token acquisition as well as fetch time", async () => {
  await expect(
    fetchMandatoryInterviewMemory(
      {
        ...config,
        timeoutMs: 100,
        getAccessToken: () => new Promise(() => {}),
      },
      1,
    ),
  ).rejects.toThrow(/timed out/);
});
it("does not silently trim mandatory memory to fit", async () => {
  const p = page("a".repeat(33000));
  p.entries[0].fields[1].totalChars = 33000;
  p.entries[0].fields[1].complete = true;
  p.budget.returnedChars = 33004;
  global.fetch = jest.fn().mockResolvedValue(response(p));
  await expect(fetchMandatoryInterviewMemory(config, 1)).rejects.toThrow();
});
